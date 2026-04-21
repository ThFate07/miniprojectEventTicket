import QRCode from "qrcode";
import dayjs from "dayjs";
import mongoose from "mongoose";
import crypto from "node:crypto";
import puppeteer from "puppeteer";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Event } from "../models/events.model.js";
import { Booking } from "../models/bookings.model.js";
import { Payment } from "../models/payment.model.js";
import { SeatLock } from "../models/seatLock.model.js";
import { User } from "../models/user.model.js";
import { Committee } from "../models/committee.model.js";
import { confirmationFormat, mail } from "../utils/email.js";
import {
  canManageCommittee,
  canManageEvent,
  canRegisterForEvent,
  isEventVisibleToUser,
  normalizeRole,
  ROLE_VALUES,
  toObjectIdString,
  userHasTenantAssignment,
} from "../utils/eventAccess.js";

const QR_SIGNING_VERSION = "v1";
let ticketBrowserPromise = null;

const getQrSigningSecret = () => process.env.QR_SIGNING_SECRET || process.env.JWT_SECRET;

const signTicketPayload = (payload) => {
  const secret = getQrSigningSecret();

  if (!secret) {
    throw new Error("QR signing secret is not configured");
  }

  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
};

const buildSignedTicketPayload = ({
  bookingId,
  eventId,
  organizerId,
  userId,
  seats,
  bookingDateTime,
  paymentId,
}) => {
  const payload = {
    v: QR_SIGNING_VERSION,
    bookingId,
    eventId,
    organizerId,
    userId,
    seats,
    bookingDateTime: new Date(bookingDateTime).toISOString(),
    paymentId,
  };

  return {
    ...payload,
    sig: signTicketPayload(payload),
  };
};

const signaturesMatch = (expected, received) => {
  if (!expected || !received || expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
};

const parseSignedTicketPayload = (qrData) => {
  const parsedPayload = typeof qrData === "string" ? JSON.parse(qrData) : qrData;

  if (!parsedPayload || typeof parsedPayload !== "object") {
    throw new Error("Ticket payload is invalid");
  }

  const { sig, ...payload } = parsedPayload;

  if (!sig || typeof sig !== "string") {
    throw new Error("Ticket signature is missing");
  }

  const expectedSignature = signTicketPayload(payload);

  if (!signaturesMatch(expectedSignature, sig)) {
    throw new Error("Ticket signature is invalid");
  }

  return payload;
};

const normalizeEventImages = (images, image) => {
  const normalizedImages = Array.isArray(images)
    ? images.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean)
    : [];

  if (normalizedImages.length > 0) {
    return normalizedImages;
  }

  if (typeof image === "string" && image.trim()) {
    return [image.trim()];
  }

  return [];
};

const normalizeTicketLimit = (value, fallback = 1) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("maxTicketsPerStudent must be at least 1");
  }

  return parsed;
};

const getBookingTicketCount = (booking) => {
  const seatsValue = booking?.seats;

  if (typeof seatsValue !== "string") {
    return 0;
  }

  const generalMatch = seatsValue.match(/^(\d+)\s+General Admission$/i);
  if (generalMatch) {
    return Number(generalMatch[1] || 0);
  }

  return seatsValue
    .split(",")
    .map((seat) => seat.trim())
    .filter(Boolean).length;
};

const getUserBookedTicketCountForEvent = async ({ eventId, userId }) => {
  const existingBookings = await Booking.find({ event_id: eventId, user_id: userId }).select("seats");

  return existingBookings.reduce((sum, booking) => sum + getBookingTicketCount(booking), 0);
};

const buildTicketLimitMeta = async ({ event, userId }) => {
  const maxTicketsPerStudent = normalizeTicketLimit(event?.maxTicketsPerStudent, 1);
  const ticketsBookedByCurrentUser = userId
    ? await getUserBookedTicketCountForEvent({ eventId: event._id, userId })
    : 0;

  return {
    maxTicketsPerStudent,
    ticketsBookedByCurrentUser,
    remainingTicketsForCurrentUser: Math.max(0, maxTicketsPerStudent - ticketsBookedByCurrentUser),
  };
};

const buildEventDateTime = (event) => {
  if (Array.isArray(event.eventDateTime) && event.eventDateTime.length > 0) {
    return event.eventDateTime;
  }

  if (event.finalDate) {
    return [event.finalDate];
  }

  if (event.tentativeDate) {
    return [event.tentativeDate];
  }

  return [];
};

const isRegistrationOpen = (event) =>
  Boolean(event?.isFinalized && (event?.lifecycleState || "") === "registration_open");

const ensureTenantMember = (req, res) => {
  if (userHasTenantAssignment(req.user)) {
    return true;
  }

  res.status(403).json({
    success: false,
    message: "Join your college first to access this feature",
  });
  return false;
};

const ensureEventVisibleOrManageable = (req, res, event) => {
  if (isEventVisibleToUser(req.user, event) || canManageEvent(req.user, event)) {
    return true;
  }

  res.status(403).json({
    success: false,
    message: "You are not allowed to access this event",
  });
  return false;
};

const ensureRegistrationOpenForUser = (req, res, event) => {
  if (!canRegisterForEvent(req.user, event)) {
    res.status(403).json({
      success: false,
      message: "You are not allowed to register for this event",
    });
    return false;
  }

  if (!event.isFinalized) {
    res.status(400).json({
      success: false,
      message: "Registration is not open until this event is finalized",
    });
    return false;
  }

  if (!isRegistrationOpen(event)) {
    res.status(400).json({
      success: false,
      message: "Registration is currently closed for this event",
    });
    return false;
  }

  return true;
};

const sanitizeEventResponse = (event) => ({
  ...event.toObject(),
  maxTicketsPerStudent: normalizeTicketLimit(event?.maxTicketsPerStudent, 1),
  roleScopedStatus: event.lifecycleState || "tentative",
});

const getManagedEvents = async (user) => {
  const normalizedRole = normalizeRole(user?.role);

  if (normalizedRole === ROLE_VALUES.PLATFORM_ADMIN) {
    return Event.find({});
  }

  if (normalizedRole === ROLE_VALUES.COLLEGE_ADMIN) {
    return Event.find({ collegeId: user.collegeId });
  }

  const committeeIds = Array.isArray(user?.committeeIds) ? user.committeeIds : [];

  return Event.find({
    $or: [{ committeeId: { $in: committeeIds } }, { organizer: user.id }],
  });
};

const normalizeLifecycleUpdate = ({ event, updateData }) => {
  const nextData = { ...updateData };

  if (!nextData.tentativeDate && event.tentativeDate) {
    nextData.tentativeDate = event.tentativeDate;
  }

  if (Object.prototype.hasOwnProperty.call(nextData, "isFinalized") || nextData.finalDate) {
    const requestedFinalized =
      typeof nextData.isFinalized === "boolean" ? nextData.isFinalized : Boolean(nextData.finalDate);

    if (requestedFinalized) {
      if (!nextData.finalDate) {
        throw new Error("finalDate is required before finalizing an event");
      }

      nextData.isFinalized = true;
      nextData.lifecycleState = "registration_open";
    } else if (nextData.isFinalized === false) {
      nextData.lifecycleState = nextData.lifecycleState || "tentative";
      nextData.finalDate = null;
    }
  } else if (!event.lifecycleState && !nextData.lifecycleState) {
    nextData.lifecycleState = event.isFinalized ? "registration_open" : "tentative";
  }

  if (nextData.lifecycleState === "finalized") {
    if (!nextData.finalDate && !event.finalDate) {
      throw new Error("finalDate is required before finalizing an event");
    }
    nextData.isFinalized = true;
  }

  if (nextData.lifecycleState === "registration_open" && !nextData.finalDate && !event.finalDate) {
    throw new Error("finalDate is required before opening registration");
  }

  return nextData;
};

const getEvents = asyncHandler(async (req, res) => {
  const { lifecycleState, committeeId } = req.query;
  const baseQuery = {};

  if (lifecycleState) {
    baseQuery.lifecycleState = lifecycleState;
  }

  if (committeeId) {
    baseQuery.committeeId = committeeId;
  }

  const events = await Event.find(baseQuery)
    .populate("committeeId", "name")
    .populate("collegeId", "name code")
    .populate("departmentIds", "name code");

  const visibleEvents = events.filter((event) => isEventVisibleToUser(req.user, event));

  return res.status(200).send({
    events: visibleEvents.map(sanitizeEventResponse),
    message: visibleEvents.length ? "Events Found" : "No Events Found",
    success: true,
  });
});

const getEventById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id)
    .populate("committeeId", "name")
    .populate("collegeId", "name code")
    .populate("departmentIds", "name code");

  if (!event) {
    return res.status(404).send({
      message: "Event Not Found",
      success: false,
    });
  }

  if (!ensureEventVisibleOrManageable(req, res, event)) {
    return;
  }

  const ticketLimitMeta = await buildTicketLimitMeta({
    event,
    userId: req.user?.id,
  });

  return res.status(200).send({
    event: {
      ...sanitizeEventResponse(event),
      ...ticketLimitMeta,
    },
    message: "Event Sent",
    success: true,
  });
});

const getEventSeatsAndTimings = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id).select(
    "seats seatMap eventDateTime cost maxTicketsPerStudent isFinalized lifecycleState tentativeDate finalDate visibilityScope collegeId departmentIds organizer"
  );

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found.",
    });
  }

  if (!ensureEventVisibleOrManageable(req, res, event)) {
    return;
  }

  const dateTimes = buildEventDateTime(event);
  const formattedTimings = dateTimes.map((dt) => {
    const dateObj = new Date(dt);
    return {
      date: dateObj.toLocaleDateString("en-CA"),
      time: dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  });

  const ticketLimitMeta = await buildTicketLimitMeta({
    event,
    userId: req.user?.id,
  });

  return res.status(200).json({
    seats: event.seats,
    cost: event.cost,
    seatMap: event.seatMap,
    eventDateTime: formattedTimings,
    isFinalized: event.isFinalized,
    lifecycleState: event.lifecycleState || "tentative",
    tentativeDate: event.tentativeDate,
    finalDate: event.finalDate,
    visibilityScope: event.visibilityScope || "global",
    ...ticketLimitMeta,
    success: true,
    message: "Event seats and timings fetched successfully",
  });
});

const getMyEvents = asyncHandler(async (req, res) => {
  const events = await getManagedEvents(req.user);
  const resolvedEvents = await events
    .populate("committeeId", "name")
    .populate("departmentIds", "name code")
    .sort({ createdAt: -1 })
    .select("-seatMap");

  return res.status(200).json({
    success: true,
    events: resolvedEvents.map((event) => sanitizeEventResponse(event)),
    message: resolvedEvents.length
      ? "Events you manage fetched successfully"
      : "You have not created any events yet",
  });
});

const getMyEventById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id)
    .populate("committeeId", "name")
    .populate("collegeId", "name code")
    .populate("departmentIds", "name code");

  if (!event || !canManageEvent(req.user, event)) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  return res.status(200).json({
    success: true,
    event: sanitizeEventResponse(event),
    message: "Event fetched successfully !",
  });
});

const postEvent = asyncHandler(async (req, res) => {
  const normalizedRole = normalizeRole(req.user.role);

  if (![ROLE_VALUES.ORGANIZER, ROLE_VALUES.COLLEGE_ADMIN, ROLE_VALUES.PLATFORM_ADMIN].includes(normalizedRole)) {
    return res.status(403).send({
      message: "Only organizers and admins can create events",
      success: false,
    });
  }

  if (!ensureTenantMember(req, res)) {
    return;
  }

  const {
    title,
    description,
    location,
    eventType,
    banner,
    image,
    images,
    eventDateTime,
    seats,
    seatMap,
    cost,
    maxTicketsPerStudent,
    certificate,
    special,
    committeeId,
    departmentIds,
    tentativeDate,
    visibilityScope = "department",
  } = req.body;

  if (
    !title ||
    !description ||
    !location ||
    !eventType ||
    !banner ||
    !eventDateTime ||
    !Array.isArray(eventDateTime) ||
    eventDateTime.length === 0 ||
    !seats ||
    !committeeId ||
    !Array.isArray(departmentIds) ||
    departmentIds.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be provided.",
    });
  }

  const committee = await Committee.findById(committeeId);

  if (!committee) {
    return res.status(404).json({
      success: false,
      message: "Committee not found",
    });
  }

  if (!canManageCommittee(req.user, committee)) {
    return res.status(403).json({
      success: false,
      message: "You cannot create events for this committee",
    });
  }

  const normalizedImages = normalizeEventImages(images, image);
  let normalizedTicketLimit;

  try {
    normalizedTicketLimit = normalizeTicketLimit(maxTicketsPerStudent, 1);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (normalizedImages.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one event image must be provided.",
    });
  }

  let finalSeatMap = [];

  if (seats.type === "RowColumns") {
    const [rows, cols] = seats.value.split("x").map(Number);

    if (isNaN(rows) || isNaN(cols)) {
      return res.status(400).json({
        success: false,
        message: "Invalid RowColumns format. Use format like '10x8'.",
      });
    }

    for (let r = 0; r < rows; r += 1) {
      const rowLabel = String.fromCharCode(65 + r);
      for (let c = 1; c <= cols; c += 1) {
        finalSeatMap.push({ seatLabel: `${rowLabel}${c}`, isBooked: false });
      }
    }
  } else if (seats.type === "direct") {
    if (!Array.isArray(seatMap) || seatMap.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Seat map is required when seats.type is 'direct'.",
      });
    }
    finalSeatMap = seatMap;
  } else if (seats.type === "general") {
    const totalTickets = Number(seats.value);

    if (isNaN(totalTickets) || totalTickets < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid ticket capacity is required for general admission events.",
      });
    }

    finalSeatMap = Array.from({ length: totalTickets }, (_, index) => ({
      seatLabel: `GA${index + 1}`,
      isBooked: false,
    }));
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid seats.type. Must be 'RowColumns', 'direct', or 'general'.",
    });
  }

  const event = await Event.create({
    title,
    description,
    location,
    eventType,
    banner,
    image: normalizedImages[0],
    images: normalizedImages,
    eventDateTime,
    seats,
    seatMap: finalSeatMap,
    cost: Number(cost || 0),
    maxTicketsPerStudent: normalizedTicketLimit,
    certificate,
    special,
    organizer: req.user.id,
    committeeId: committee._id,
    collegeId: committee.collegeId,
    departmentIds,
    tentativeDate: tentativeDate || eventDateTime[0],
    finalDate: null,
    isFinalized: false,
    visibilityScope,
    lifecycleState: "tentative",
    status: "upcoming",
  });

  await User.findByIdAndUpdate(req.user.id, { $addToSet: { eventsOrganized: event._id } });

  return res.status(201).json({
    event,
    message: "Event Created Successfully",
    success: true,
  });
});

const updateMyEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id);

  if (!event || !canManageEvent(req.user, event)) {
    return res.status(404).json({
      success: false,
      message: "Event Not Found or you're not authorized to edit it.",
    });
  }

  const updateData = { ...req.body };
  if (Object.prototype.hasOwnProperty.call(updateData, "maxTicketsPerStudent")) {
    try {
      updateData.maxTicketsPerStudent = normalizeTicketLimit(
        updateData.maxTicketsPerStudent,
        event.maxTicketsPerStudent || 1
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "committeeId")) {
    const committee = await Committee.findById(req.body.committeeId);

    if (!committee) {
      return res.status(404).json({
        success: false,
        message: "Committee not found.",
      });
    }

    if (!canManageCommittee(req.user, committee)) {
      return res.status(403).json({
        success: false,
        message: "You cannot move this event to the selected committee.",
      });
    }

    updateData.collegeId = committee.collegeId;
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, "images") ||
    Object.prototype.hasOwnProperty.call(req.body, "image")
  ) {
    const normalizedImages = normalizeEventImages(req.body.images, req.body.image);

    if (normalizedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one event image must be provided.",
      });
    }

    updateData.images = normalizedImages;
    updateData.image = normalizedImages[0];
  }

  let normalizedUpdateData;

  try {
    normalizedUpdateData = normalizeLifecycleUpdate({ event, updateData });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  const updatedEvent = await Event.findByIdAndUpdate(
    id,
    { $set: normalizedUpdateData },
    { new: true }
  )
    .populate("committeeId", "name")
    .populate("departmentIds", "name code");

  return res.status(200).json({
    success: true,
    event: sanitizeEventResponse(updatedEvent),
    message: "Event Updated Successfully",
  });
});

const deleteMyEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id);

  if (!event || !canManageEvent(req.user, event)) {
    return res.status(404).json({
      success: false,
      message: "Event not found ",
    });
  }

  if (event.status !== "upcoming") {
    return res.status(400).json({
      success: false,
      message: "Only upcoming events can be deleted",
    });
  }

  const existingBookings = await Booking.find({ event_id: id });

  if (existingBookings.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Event cannot be deleted because bookings already exist",
    });
  }

  await Event.findByIdAndDelete(id);

  return res.status(200).json({
    success: true,
    message: "Event deleted successfully",
  });
});

const getBookings = asyncHandler(async (req, res) => {
  const events = await getManagedEvents(req.user);
  const managedEvents = await events.select("_id");
  const eventIds = managedEvents.map((event) => event._id);

  const bookings = await Booking.find({ event_id: { $in: eventIds } })
    .populate({
      path: "user_id",
      select:
        "username email fullName collegeEmail studentId phoneNumber collegeId departmentId",
      populate: [
        { path: "collegeId", select: "name code" },
        { path: "departmentId", select: "name code" },
      ],
    })
    .populate("event_id", "title lifecycleState visibilityScope");

  return res.status(200).json({
    success: true,
    bookings,
    message: bookings.length ? "Bookings fetched successfully" : "No bookings",
  });
});

const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user_id: req.user.id }).populate(
    "event_id",
    "title eventDateTime location image images eventType lifecycleState visibilityScope banner"
  );

  return res.status(200).json({
    success: true,
    bookings,
    message: bookings.length ? "Your bookings fetched successfully" : "You have not booked any events",
  });
});

const getOrganizerSummary = asyncHandler(async (req, res) => {
  const events = await getManagedEvents(req.user);
  const managedEvents = await events.select("totalBookings totalRevenue status collegeId");
  const eventIds = managedEvents.map((event) => event._id);

  const totalBookings = managedEvents.reduce((sum, event) => sum + (event.totalBookings || 0), 0);
  const totalRevenue = managedEvents.reduce((sum, event) => sum + (event.totalRevenue || 0), 0);
  const activeShows = managedEvents.filter((event) => event.status === "active").length;
  const colleges = new Set(managedEvents.map((event) => toObjectIdString(event.collegeId)).filter(Boolean));

  const userFilter =
    req.user.role === ROLE_VALUES.PLATFORM_ADMIN
      ? { role: ROLE_VALUES.STUDENT }
      : { role: ROLE_VALUES.STUDENT, collegeId: { $in: Array.from(colleges) } };

  const totalUsers = await User.countDocuments(userFilter);

  return res.status(200).json({
    success: true,
    message: "Dashboard stats fetched",
    counts: {
      totalBookings,
      totalRevenue,
      activeShows,
      totalUsers,
    },
  });
});

const checkSeatsAvailability = asyncHandler(async (req, res) => {
  const { event_id, seats } = req.body;

  if (!event_id || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Event ID and seats array are required.",
    });
  }

  const event = await Event.findById(event_id).select("seatMap isFinalized lifecycleState visibilityScope departmentIds collegeId");
  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found.",
    });
  }

  if (!ensureRegistrationOpenForUser(req, res, event)) {
    return;
  }

  const seatSet = new Set(seats);
  const alreadyBooked = event.seatMap
    .filter((seatObj) => seatSet.has(seatObj.seatLabel) && seatObj.isBooked)
    .map((seatObj) => seatObj.seatLabel);

  if (alreadyBooked.length > 0) {
    return res.status(400).json({
      success: true,
      available: false,
      alreadyBooked,
      message: `Some seats are already booked: ${alreadyBooked.join(", ")}`,
    });
  }
  return res.status(200).json({
    success: true,
    available: true,
    message: "All selected seats are available.",
  });
});

const generateTicketQR = async (data) => {
  const qrContent = JSON.stringify(data);
  return QRCode.toDataURL(qrContent);
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatTicketDate = (value) => {
  if (!value) {
    return "TBA";
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : "TBA";
};

const formatTicketDateTime = (value) => {
  if (!value) {
    return "To be announced";
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("D MMM YYYY, h:mm A") : "To be announced";
};

const formatTicketCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const getTicketBrowser = async () => {
  if (!ticketBrowserPromise) {
    ticketBrowserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  return ticketBrowserPromise;
};

const buildTicketPdfHtml = ({ booking, event }) => {
  const title = booking.event_title || event?.title || "Event";
  const primaryDate = getPrimaryDateTime(event?.eventDateTime, booking.booking_dateTime);
  const showDateTime = formatTicketDateTime(primaryDate);
  const venue = event?.location || "Venue to be announced";
  const seats = booking.seats || "Not assigned";
  const status = String(event?.lifecycleState || booking.event_status || "Confirmed").replaceAll("_", " ").toUpperCase();
  const eventType = event?.eventType || "Campus Event";
  const bookingId = booking._id || booking.booking_id || "Unavailable";
  const attendee = booking.user_id?.fullName || booking.user_id?.username || "Registered attendee";
  const amountPaid = formatTicketCurrency(booking.paymentAmt);
  const issueDate = formatTicketDate(booking.booking_dateTime || new Date().toISOString());

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: #f8f4ec;
            color: #18181b;
          }
          .page {
            width: 794px;
            margin: 0 auto;
            padding: 32px;
          }
          .card {
            background: #ffffff;
            border: 1px solid #e0d8cd;
            border-radius: 28px;
            padding: 24px;
            margin-top: 24px;
          }
          .header {
            background: #111827;
            color: #ffffff;
            border-radius: 30px;
            padding: 30px;
          }
          .header-grid {
            display: table;
            width: 100%;
          }
          .header-main, .header-side {
            display: table-cell;
            vertical-align: top;
          }
          .header-main {
            width: 72%;
            padding-right: 18px;
          }
          .header-side {
            width: 28%;
          }
          .status {
            display: inline-block;
            float: right;
            background: #d66a4a;
            color: #fff8f0;
            border-radius: 999px;
            padding: 12px 18px;
            font-size: 17px;
            font-weight: 700;
          }
          .type-box {
            clear: both;
            margin-top: 22px;
            background: #f9e5d6;
            border-radius: 24px;
            padding: 22px 18px;
            text-align: center;
          }
          .eyebrow {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.06em;
          }
          .hero-title {
            margin-top: 18px;
            font-size: 56px;
            line-height: 1;
            font-weight: 800;
          }
          .hero-copy {
            margin-top: 16px;
            max-width: 430px;
            font-size: 22px;
            line-height: 1.35;
            color: #dde5f0;
          }
          .event-title {
            margin-top: 24px;
            max-width: 470px;
            font-size: 34px;
            line-height: 1.16;
            font-weight: 800;
            word-break: break-word;
          }
          .section-title {
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.03em;
            color: #d66a4a;
          }
          .muted-title {
            color: #1c875c;
          }
          .detail-row {
            display: table;
            width: 100%;
            border-spacing: 0 14px;
            margin-top: 4px;
          }
          .detail-cell {
            display: table-cell;
            width: 50%;
            vertical-align: top;
          }
          .detail-cell:first-child { padding-right: 7px; }
          .detail-cell:last-child { padding-left: 7px; }
          .info-box {
            border-radius: 22px;
            padding: 20px 24px;
            background: #faf7f1;
          }
          .info-box.peach { background: #f9e5d6; }
          .info-box.blue { background: #e7eefc; }
          .label {
            font-size: 15px;
            font-weight: 700;
            color: #57534e;
            letter-spacing: 0.03em;
          }
          .value {
            margin-top: 16px;
            font-size: 22px;
            line-height: 1.25;
            font-weight: 800;
            word-break: break-word;
          }
          .entry-card {
            background: #e1f4ec;
            border-radius: 28px;
            padding: 24px;
            margin-top: 24px;
          }
          .entry-copy {
            margin-top: 14px;
            max-width: 620px;
            font-size: 18px;
            line-height: 1.4;
            color: #57534e;
          }
          .qr-shell {
            margin-top: 20px;
            background: #ffffff;
            border-radius: 24px;
            padding: 20px;
            text-align: center;
          }
          .qr-shell img {
            display: block;
            width: 180px;
            height: 180px;
            margin: 0 auto;
            object-fit: contain;
          }
          .identity-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 12px 0;
          }
          .notes {
            background: #f9e5d6;
            border-radius: 28px;
            padding: 24px;
            margin-top: 24px;
          }
          .note {
            margin-top: 10px;
            font-size: 18px;
            line-height: 1.45;
          }
          .footer {
            margin-top: 24px;
            border-top: 1px solid #e0d8cd;
            padding-top: 18px;
            display: table;
            width: 100%;
            font-size: 16px;
            color: #57534e;
          }
          .footer div {
            display: table-cell;
          }
          .footer div:last-child {
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="header-grid">
              <div class="header-main">
                <div class="eyebrow">HOSTMYSHOW PRESENTS</div>
                <div class="hero-title">Event Pass</div>
                <div class="hero-copy">A clean pass for smooth check-in, sharing, and day-of-event verification.</div>
                <div class="event-title">${escapeHtml(title)}</div>
              </div>
              <div class="header-side">
                <div class="status">${escapeHtml(status)}</div>
                <div class="type-box">
                  <div class="label" style="color:#d66a4a;">EVENT TYPE</div>
                  <div class="value" style="color:#d66a4a;">${escapeHtml(eventType)}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="section-title">PASS DETAILS</div>
            <div class="detail-row">
              <div class="detail-cell">
                <div class="info-box peach">
                  <div class="label">DATE</div>
                  <div class="value" style="color:#d66a4a;">${escapeHtml(formatTicketDate(primaryDate))}</div>
                </div>
              </div>
              <div class="detail-cell">
                <div class="info-box blue">
                  <div class="label">ISSUED</div>
                  <div class="value">${escapeHtml(issueDate)}</div>
                </div>
              </div>
            </div>
            <div class="info-box" style="margin-top:14px;">
              <div class="label">DATE & TIME</div>
              <div class="value">${escapeHtml(showDateTime)}</div>
            </div>
            <div class="info-box" style="margin-top:14px;">
              <div class="label">VENUE</div>
              <div class="value">${escapeHtml(venue)}</div>
            </div>
          </div>

          <div class="entry-card">
            <div class="section-title muted-title">ENTRY SUMMARY</div>
            <div class="entry-copy">Present this pass at the gate. The QR code and booking details below are enough for a smooth entry.</div>
            <div class="qr-shell">
              ${
                booking.ticket_qr
                  ? `<img src="${booking.ticket_qr}" alt="Ticket QR" />`
                  : `<div style="width:180px;height:180px;margin:0 auto;border:1px solid #e0d8cd;border-radius:18px;display:flex;align-items:center;justify-content:center;color:#57534e;font-weight:700;">QR pending</div>`
              }
              <div class="label" style="margin-top:12px;">SCAN AT ENTRY</div>
            </div>
            <div class="info-box" style="margin-top:16px;background:#ffffff;">
              <div class="label">SEAT / PASS</div>
              <div class="value">${escapeHtml(seats)}</div>
            </div>
            <div class="info-box" style="margin-top:14px;background:#ffffff;">
              <div class="label">AMOUNT PAID</div>
              <div class="value">${escapeHtml(amountPaid)}</div>
            </div>
          </div>

          <div class="card">
            <table class="identity-table">
              <tr>
                <td>
                  <div class="info-box">
                    <div class="label">ATTENDEE</div>
                    <div class="value" style="font-size:20px;">${escapeHtml(attendee)}</div>
                  </div>
                </td>
                <td>
                  <div class="info-box">
                    <div class="label">BOOKING ID</div>
                    <div class="value" style="font-size:20px;">${escapeHtml(bookingId)}</div>
                  </div>
                </td>
                <td>
                  <div class="info-box">
                    <div class="label">PLATFORM</div>
                    <div class="value" style="font-size:20px;">HostMyShow</div>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <div class="notes">
            <div class="section-title">Before you arrive</div>
            <div class="note">• Carry this PDF or the in-app ticket for scanning.</div>
            <div class="note">• Arrive 15 minutes early to avoid queue rush near the venue entrance.</div>
            <div class="note">• Keep the QR code visible and avoid sharing it publicly after check-in.</div>
          </div>

          <div class="footer">
            <div><strong>HostMyShow</strong> &nbsp; Campus events, checked in beautifully.</div>
            <div>Generated ticket</div>
          </div>
        </div>
      </body>
    </html>
  `;
};

const renderTicketPdf = async ({ booking, event }) => {
  const browser = await getTicketBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(buildTicketPdfHtml({ booking, event }), {
      waitUntil: "networkidle0",
    });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });
  } finally {
    await page.close();
  }
};

const getTicketFileName = (booking) =>
  `BookMyEvent_Ticket_${booking?._id || booking?.booking_id || "booking"}.pdf`;

const downloadTicketPdf = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const booking = await Booking.findById(bookingId)
    .populate("user_id", "username fullName email")
    .populate(
      "event_id",
      "title eventDateTime location eventType lifecycleState banner"
    );

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  const event = await Event.findById(booking.event_id?._id || booking.event_id);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  const bookingOwnerId = booking.user_id?._id?.toString() || booking.user_id?.toString();
  const canAccessTicket =
    bookingOwnerId === req.user.id || canManageEvent(req.user, event);

  if (!canAccessTicket) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to access this ticket",
    });
  }

  const pdfBuffer = await renderTicketPdf({
    booking,
    event: booking.event_id || event,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${getTicketFileName(booking)}"`);
  return res.status(200).send(pdfBuffer);
});

const bookTicket = asyncHandler(async (req, res) => {
  const user_id = req.user.id;
  const { event_id, booking_dateTime, seats, payment_id, paymentAmt } = req.body;

  if (!event_id || !booking_dateTime || !seats) {
    return res.status(400).json({
      success: false,
      message: "event_id, booking_dateTime, and seats are required.",
    });
  }

  const user = await User.findById(user_id);
  const event = await Event.findById(event_id);

  if (!user || !event) {
    return res.status(404).json({
      success: false,
      message: "Event or user not found",
    });
  }

  if (!ensureRegistrationOpenForUser(req, res, event)) {
    return;
  }

  const isFreeEvent = Number(event.cost || 0) === 0;
  const normalizedPaymentId = isFreeEvent ? "FREE" : payment_id;
  const normalizedPaymentAmt = isFreeEvent ? 0 : Number(paymentAmt || 0);

  if (!isFreeEvent) {
    if (!normalizedPaymentId || !normalizedPaymentAmt) {
      return res.status(400).json({
        success: false,
        message: "Payment details are required for paid events.",
      });
    }

    const verifiedPayment = await Payment.findOne({ razorpay_payment_id: normalizedPaymentId });
    if (!verifiedPayment) {
      return res.status(400).send({
        message: "Payment is not completed",
        success: false,
      });
    }
  }

  const seatList = seats.split(",").map((seat) => seat.trim()).filter(Boolean);
  const requestedTicketCount = seatList.length;
  const maxTicketsPerStudent = normalizeTicketLimit(event.maxTicketsPerStudent, 1);
  const ticketsBookedByUser = await getUserBookedTicketCountForEvent({
    eventId: event_id,
    userId: user_id,
  });

  if (ticketsBookedByUser + requestedTicketCount > maxTicketsPerStudent) {
    const remaining = Math.max(0, maxTicketsPerStudent - ticketsBookedByUser);
    return res.status(400).json({
      success: false,
      message:
        remaining > 0
          ? `You can only book ${remaining} more ticket${remaining === 1 ? "" : "s"} for this event`
          : "You have already reached the ticket limit for this event",
    });
  }

  const activeLocks = await SeatLock.find({
    event_id,
    seatLabel: { $in: seatList },
    expiresAt: { $gt: new Date() },
  });

  if (activeLocks.length > 0) {
    const otherUserLocks = activeLocks.filter((lock) => lock.user_id.toString() !== user_id.toString());

    if (otherUserLocks.length > 0) {
      const lockedSeats = otherUserLocks.map((lock) => lock.seatLabel);
      return res.status(400).json({
        success: false,
        message: `Seats ${lockedSeats.join(", ")} are currently being selected by other users`,
      });
    }
  }

  const invalidSeats = [];
  const updatedSeatMap = event.seatMap.map((seatObj) => {
    if (seatList.includes(seatObj.seatLabel)) {
      if (seatObj.isBooked) {
        invalidSeats.push(seatObj.seatLabel);
      }
      return { ...seatObj.toObject?.() || seatObj, isBooked: true };
    }
    return seatObj;
  });

  if (invalidSeats.length > 0) {
    return res.status(400).json({
      success: false,
      message: `These seats are already booked: ${invalidSeats.join(", ")}`,
    });
  }

  event.seatMap = updatedSeatMap;
  event.totalBookings = (event.totalBookings || 0) + seatList.length;
  event.totalRevenue = (event.totalRevenue || 0) + normalizedPaymentAmt;
  event.users = Array.from(new Set([...(event.users || []).map((entry) => entry.toString()), user_id]));
  await event.save();

  const bookingId = new mongoose.Types.ObjectId();
  const qrCodeData = buildSignedTicketPayload({
    bookingId: bookingId.toString(),
    eventId: event_id,
    organizerId: event.organizer?.toString() || req.user.id,
    userId: user_id,
    seats: seatList,
    bookingDateTime: booking_dateTime,
    paymentId: normalizedPaymentId,
  });
  const qrCode = await generateTicketQR(qrCodeData);

  const displaySeats =
    event.seats?.type === "general" ? `${seatList.length} General Admission` : seatList.join(",");

  const booking = await Booking.create({
    _id: bookingId,
    user_id,
    event_id,
    organizer_id: event.organizer || req.user.id,
    booking_dateTime,
    seats: displaySeats,
    ticket_qr: qrCode,
    payment_id: normalizedPaymentId,
    paymentAmt: normalizedPaymentAmt,
    event_status: event.status,
    collegeId: event.collegeId || user.collegeId,
    departmentId: user.departmentId,
    committeeId: event.committeeId || null,
  });

  await User.findByIdAndUpdate(user_id, { $addToSet: { eventsAttended: event._id } });
  await SeatLock.deleteMany({
    event_id,
    seatLabel: { $in: seatList },
  });

  const { io } = await import("../index.js");
  if (io) {
    io.to(`event-${event_id}`).emit("seats-booked", {
      seats: seatList,
      timestamp: new Date(),
    });
  }

  res.status(201).json({
    success: true,
    message: isFreeEvent ? "Registration successful!" : "Booking successful!",
    booking,
  });

  try {
    const base64Data = booking.ticket_qr.split(",")[1];
    const htmlContent = confirmationFormat(
      event.title,
      booking.booking_dateTime,
      booking.seats,
      req.user.email,
      booking.ticket_qr,
      booking.payment_id,
      booking.paymentAmt
    );

    const finalHtml = htmlContent.replace(
      "{{TICKET_QR}}",
      `<img src="cid:ticketqr" alt="Ticket QR" style="width: 200px;" />`
    );

    await mail({
      to: req.user.email,
      subject: isFreeEvent ? "Registration Confirmation" : "Confirmation of Ticket",
      html: finalHtml,
      attachments: [
        {
          filename: "ticketqr.png",
          content: base64Data,
          encoding: "base64",
          cid: "ticketqr",
        },
      ],
    });
  } catch (emailError) {
    console.error("Error sending confirmation email:", emailError);
  }
});

const validateTicketEntry = asyncHandler(async (req, res) => {
  const { qrData, eventId } = req.body;

  if (!qrData) {
    return res.status(400).json({
      success: false,
      message: "QR data is required",
    });
  }

  let ticketPayload;

  try {
    ticketPayload = parseSignedTicketPayload(qrData);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Ticket QR code is invalid",
    });
  }

  const booking = await Booking.findById(ticketPayload.bookingId)
    .populate("user_id", "username email")
    .populate("event_id", "title committeeId collegeId organizer");

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found for this ticket",
    });
  }

  const event = await Event.findById(booking.event_id?._id || booking.event_id);
  if (!event || !canManageEvent(req.user, event)) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to validate this ticket",
    });
  }

  const bookingEventId = booking.event_id?._id?.toString() || booking.event_id?.toString();
  const bookingUserId = booking.user_id?._id?.toString() || booking.user_id?.toString();

  if (eventId && bookingEventId !== eventId) {
    return res.status(400).json({
      success: false,
      message: "This ticket belongs to a different event",
    });
  }

  if (
    ticketPayload.v !== QR_SIGNING_VERSION ||
    ticketPayload.eventId !== bookingEventId ||
    ticketPayload.userId !== bookingUserId ||
    ticketPayload.paymentId !== booking.payment_id
  ) {
    return res.status(400).json({
      success: false,
      message: "Ticket data does not match the stored booking",
    });
  }

  if (booking.ticket_redeem) {
    return res.status(409).json({
      success: false,
      message: "Ticket has already been redeemed",
      booking: {
        id: booking._id,
        attendeeName: booking.user_id?.username || "Unknown",
        attendeeEmail: booking.user_id?.email || "",
        eventTitle: booking.event_id?.title || "Event",
        seats: booking.seats,
        paymentAmt: booking.paymentAmt,
        redeemedAt: booking.ticket_redeemedAt,
      },
    });
  }

  booking.ticket_redeem = true;
  booking.ticket_redeemedAt = new Date();
  await booking.save();

  return res.status(200).json({
    success: true,
    message: "Ticket validated and redeemed successfully",
    booking: {
      id: booking._id,
      attendeeName: booking.user_id?.username || "Unknown",
      attendeeEmail: booking.user_id?.email || "",
      eventTitle: booking.event_id?.title || "Event",
      seats: booking.seats,
      paymentAmt: booking.paymentAmt,
      redeemedAt: booking.ticket_redeemedAt,
    },
  });
});

const getBookedEvents = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user_id: req.user.id }).populate({
    path: "event_id",
    select: "title banner status eventDateTime lifecycleState visibilityScope",
  });

  const validEvents = bookings.filter((booking) => booking.event_id).map((booking) => booking.event_id);

  res.status(200).send({
    success: true,
    message: "Booked events fetched successfully",
    count: validEvents.length,
    data: validEvents,
  });
});

const lockSeat = asyncHandler(async (req, res) => {
  const { eventId, seatLabel } = req.body;
  const userId = req.user.id;
  const sessionId = req.sessionID || req.headers["x-session-id"] || "unknown";

  if (!eventId || !seatLabel) {
    return res.status(400).json({
      success: false,
      message: "Event ID and seat label are required.",
    });
  }

  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  if (!ensureRegistrationOpenForUser(req, res, event)) {
    return;
  }

  const seat = event.seatMap.find((entry) => entry.seatLabel === seatLabel);
  if (!seat) {
    return res.status(404).json({
      success: false,
      message: "Seat not found",
    });
  }

  if (seat.isBooked) {
    return res.status(400).json({
      success: false,
      message: "Seat is already booked",
    });
  }

  const existingLock = await SeatLock.findOne({
    event_id: eventId,
    seatLabel,
  });

  if (existingLock && existingLock.isValid()) {
    if (existingLock.user_id.toString() !== userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Seat is currently being selected by another user",
      });
    }

    existingLock.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await existingLock.save();
    return res.status(200).json({
      success: true,
      message: "Seat lock extended successfully",
      expiresAt: existingLock.expiresAt,
    });
  }

  if (existingLock) {
    await SeatLock.findByIdAndDelete(existingLock._id);
  }

  const lockExpiry = new Date(Date.now() + 5 * 60 * 1000);
  await SeatLock.create({
    event_id: eventId,
    seatLabel,
    user_id: userId,
    expiresAt: lockExpiry,
    sessionId,
  });

  res.status(200).json({
    success: true,
    message: "Seat locked successfully",
    expiresAt: lockExpiry,
  });
});

const unlockSeat = asyncHandler(async (req, res) => {
  const { eventId, seatLabel } = req.body;
  const userId = req.user.id;

  if (!eventId || !seatLabel) {
    return res.status(400).json({
      success: false,
      message: "Event ID and seat label are required.",
    });
  }

  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  if (!ensureRegistrationOpenForUser(req, res, event)) {
    return;
  }

  const deletedLock = await SeatLock.findOneAndDelete({
    event_id: eventId,
    seatLabel,
    user_id: userId,
  });

  if (!deletedLock) {
    return res.status(404).json({
      success: false,
      message: "No active lock found for this seat",
    });
  }

  res.status(200).json({
    success: true,
    message: "Seat unlocked successfully",
  });
});

const getSeatLocks = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const currentUserId = req.user.id;

  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: "Event ID is required.",
    });
  }

  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  if (!ensureRegistrationOpenForUser(req, res, event)) {
    return;
  }

  const locks = await SeatLock.find({
    event_id: eventId,
    expiresAt: { $gt: new Date() },
  })
    .populate("user_id", "username email")
    .select("seatLabel user_id lockedAt expiresAt");

  res.status(200).json({
    success: true,
    locks: locks.map((lock) => ({
      seatLabel: lock.seatLabel,
      userId: lock.user_id._id,
      userName: lock.user_id.username,
      lockedAt: lock.lockedAt,
      expiresAt: lock.expiresAt,
      isCurrentUser: lock.user_id._id.toString() === currentUserId.toString(),
    })),
    currentUserId,
    message: "Active seat locks fetched successfully",
  });
});

const checkSeatsAvailabilityWithLocks = asyncHandler(async (req, res) => {
  const { event_id, seats } = req.body;
  const userId = req.user.id;

  if (!event_id || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Event ID and seats array are required.",
    });
  }

  const event = await Event.findById(event_id).select(
    "seatMap isFinalized lifecycleState visibilityScope departmentIds collegeId"
  );
  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found.",
    });
  }

  if (!ensureRegistrationOpenForUser(req, res, event)) {
    return;
  }

  const activeLocks = await SeatLock.find({
    event_id,
    expiresAt: { $gt: new Date() },
  });

  const lockedSeats = new Set(activeLocks.map((lock) => lock.seatLabel));
  const seatSet = new Set(seats);

  const alreadyBooked = event.seatMap
    .filter((seatObj) => seatSet.has(seatObj.seatLabel) && seatObj.isBooked)
    .map((seatObj) => seatObj.seatLabel);

  const currentlyLocked = seats.filter(
    (seat) =>
      lockedSeats.has(seat) &&
      !activeLocks.find((lock) => lock.seatLabel === seat && lock.user_id.toString() === userId.toString())
  );

  if (alreadyBooked.length > 0) {
    return res.status(400).json({
      success: true,
      available: false,
      alreadyBooked,
      message: `Some seats are already booked: ${alreadyBooked.join(", ")}`,
    });
  }

  if (currentlyLocked.length > 0) {
    return res.status(400).json({
      success: true,
      available: false,
      currentlyLocked,
      message: `Some seats are currently being selected by other users: ${currentlyLocked.join(", ")}`,
    });
  }

  return res.status(200).json({
    success: true,
    available: true,
    message: "All selected seats are available.",
  });
});

export {
  getEvents,
  getEventById,
  postEvent,
  getEventSeatsAndTimings,
  getMyEvents,
  getMyEventById,
  updateMyEvent,
  deleteMyEvent,
  getBookings,
  getMyBookings,
  getOrganizerSummary,
  bookTicket,
  validateTicketEntry,
  checkSeatsAvailability,
  getBookedEvents,
  lockSeat,
  unlockSeat,
  getSeatLocks,
  checkSeatsAvailabilityWithLocks,
  downloadTicketPdf,
};
