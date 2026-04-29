import QRCode from "qrcode";
import mongoose from "mongoose";
import crypto from "node:crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Event } from "../models/events.model.js";
import { Booking } from "../models/bookings.model.js";
import { Payment } from "../models/payment.model.js";
import { SeatLock } from "../models/seatLock.model.js";
import { User } from "../models/user.model.js";
import { Committee } from "../models/committee.model.js";
import { confirmationFormat, eventConfirmedInterestFormat, mail } from "../utils/email.js";
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

const QR_SIGNING_VERSION = "v2";
const LEGACY_QR_SIGNING_VERSION = "v1";
const QR_TOKEN_PREFIX = "bme";

const getQrSigningSecret = () => process.env.QR_SIGNING_SECRET || process.env.JWT_SECRET;

const signTicketPayload = (payload) => {
  const secret = getQrSigningSecret();

  if (!secret) {
    throw new Error("QR signing secret is not configured");
  }

  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
};

const buildSignedTicketPayload = ({ bookingId }) => {
  const payload = {
    v: QR_SIGNING_VERSION,
    b: bookingId,
  };

  return `${QR_TOKEN_PREFIX}:${payload.v}:${payload.b}:${signTicketPayload(payload)}`;
};

const signaturesMatch = (expected, received) => {
  if (!expected || !received || expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
};

const parseTicketPayload = (qrData) => {
  if (typeof qrData === "string") {
    const normalizedQrData = qrData.trim();

    if (!normalizedQrData) {
      throw new Error("QR data is empty");
    }

    if (normalizedQrData.startsWith(`${QR_TOKEN_PREFIX}:`)) {
      const [prefix, version, bookingId, signature, ...extraParts] = normalizedQrData.split(":");

      if (
        prefix !== QR_TOKEN_PREFIX ||
        !version ||
        !bookingId ||
        !signature ||
        extraParts.length > 0
      ) {
        throw new Error("Ticket QR code could not be decoded");
      }

      const payload = {
        v: version,
        b: bookingId,
      };

      const expectedSignature = signTicketPayload(payload);

      if (!signaturesMatch(expectedSignature, signature)) {
        throw new Error("Ticket signature is invalid");
      }

      return {
        payload: {
          v: version,
          bookingId,
        },
        format: "signed_compact",
      };
    }

    let parsedPayload;

    try {
      parsedPayload = JSON.parse(normalizedQrData);
    } catch (error) {
      throw new Error("Ticket QR code could not be decoded");
    }

    if (typeof parsedPayload === "string") {
      return parseTicketPayload(parsedPayload);
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
      throw new Error("Ticket payload is invalid");
    }

    const { sig, ...payload } = parsedPayload;

    if (!sig) {
      return {
        payload,
        format: "legacy",
      };
    }

    if (typeof sig !== "string") {
      throw new Error("Ticket signature is invalid");
    }

    const expectedSignature = signTicketPayload(payload);

    if (!signaturesMatch(expectedSignature, sig)) {
      throw new Error("Ticket signature is invalid");
    }

    return {
      payload,
      format: "signed_json",
    };
  }

  if (!qrData || typeof qrData !== "object") {
    throw new Error("Ticket payload is invalid");
  }

  const { sig, ...payload } = qrData;

  if (!sig) {
    return {
      payload,
      format: "legacy",
    };
  }

  if (typeof sig !== "string") {
    throw new Error("Ticket signature is invalid");
  }

  const expectedSignature = signTicketPayload(payload);

  if (!signaturesMatch(expectedSignature, sig)) {
    throw new Error("Ticket signature is invalid");
  }

  return {
    payload,
    format: "signed_json",
  };
};

const getSignedTicketQrForBooking = async (bookingId) =>
  generateTicketQR(
    buildSignedTicketPayload({
      bookingId: bookingId.toString(),
    })
  );

const buildCheckInBookingSummary = (booking) => ({
  id: booking._id,
  attendeeName: booking.user_id?.username || "Unknown",
  attendeeEmail: booking.user_id?.email || "",
  eventTitle: booking.event_id?.title || "Event",
  seats: booking.seats,
  paymentAmt: booking.paymentAmt,
  redeemedAt: booking.ticket_redeemedAt,
});

const findBookingForTicketPayload = async ({ bookingId, eventId, userId, paymentId, seats }) => {
  if (bookingId && mongoose.isValidObjectId(bookingId)) {
    const directMatch = await Booking.findById(bookingId)
      .populate("user_id", "username email")
      .populate("event_id", "title committeeId collegeId organizer");

    if (directMatch) {
      return {
        booking: directMatch,
        resolution: "booking_id",
      };
    }
  }

  const fallbackQuery = {};

  if (eventId && mongoose.isValidObjectId(eventId)) {
    fallbackQuery.event_id = eventId;
  }

  if (userId && mongoose.isValidObjectId(userId)) {
    fallbackQuery.user_id = userId;
  }

  if (paymentId) {
    fallbackQuery.payment_id = paymentId;
  }

  if (seats) {
    fallbackQuery.seats = seats;
  }

  if (Object.keys(fallbackQuery).length === 0) {
    return {
      booking: null,
      resolution: null,
    };
  }

  const matchingBookings = await Booking.find(fallbackQuery)
    .sort({ createdAt: -1 })
    .limit(2)
    .populate("user_id", "username email")
    .populate("event_id", "title committeeId collegeId organizer");

  if (matchingBookings.length !== 1) {
    return {
      booking: null,
      resolution: matchingBookings.length > 1 ? "ambiguous_fallback" : "fallback_not_found",
    };
  }

  return {
    booking: matchingBookings[0],
    resolution: "fallback_lookup",
  };
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

const normalizeVisibilityScope = (value) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ["department", "college", "global"].includes(normalized) ? normalized : "department";
};

const normalizeScopedDepartmentIds = ({ visibilityScope, departmentIds, fallbackDepartmentIds = [] }) => {
  const normalizedScope = normalizeVisibilityScope(visibilityScope);
  const sourceDepartmentIds = Array.isArray(departmentIds)
    ? departmentIds
    : Array.isArray(fallbackDepartmentIds)
      ? fallbackDepartmentIds
      : [];

  const normalizedDepartmentIds = sourceDepartmentIds
    .map((departmentId) => toObjectIdString(departmentId))
    .filter(Boolean);

  if (normalizedScope === "global") {
    return [];
  }

  if (normalizedScope === "college") {
    return normalizedDepartmentIds;
  }

  if (normalizedDepartmentIds.length === 0) {
    throw new Error("Select at least one department for department-level events.");
  }

  return normalizedDepartmentIds;
};

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

const sanitizeEventResponse = (event, currentUserId = null) => {
  const eventObject = event.toObject();
  const interestedUsers = Array.isArray(eventObject.interestedUsers) ? eventObject.interestedUsers : [];
  const currentUserIdString = toObjectIdString(currentUserId);

  return {
    ...eventObject,
    maxTicketsPerStudent: normalizeTicketLimit(event?.maxTicketsPerStudent, 1),
    roleScopedStatus: event.lifecycleState || "tentative",
    interestedCount: interestedUsers.length,
    interestedByCurrentUser: Boolean(
      currentUserIdString &&
      interestedUsers.some((userId) => toObjectIdString(userId) === currentUserIdString)
    ),
  };
};

const notifyInterestedUsersForConfirmedEvent = async (event) => {
  const interestedUsers = Array.isArray(event?.interestedUsers) ? event.interestedUsers : [];

  if (interestedUsers.length === 0) {
    return;
  }

  const students = await User.find({ _id: { $in: interestedUsers } }).select("email username fullName");
  const recipients = students
    .map((student) => student.email)
    .filter(Boolean);

  if (recipients.length === 0) {
    return;
  }

  const html = eventConfirmedInterestFormat(event);

  await Promise.allSettled(
    recipients.map((email) =>
      mail({
        to: email,
        subject: `${event.title} is confirmed`,
        html,
      })
    )
  );
};

const getManagedEvents = (user) => {
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
  const normalizedEventDateTimes = Array.isArray(nextData.eventDateTime)
    ? nextData.eventDateTime.filter(Boolean)
    : [];
  const primaryEventDate = normalizedEventDateTimes[0] || event.eventDateTime?.[0] || event.finalDate || event.tentativeDate;

  if (primaryEventDate) {
    nextData.tentativeDate = primaryEventDate;
    nextData.finalDate = nextData.finalDate || primaryEventDate;
    nextData.isFinalized = true;
    nextData.lifecycleState = "registration_open";
  } else if (!nextData.tentativeDate && event.tentativeDate) {
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
    events: visibleEvents.map((event) => sanitizeEventResponse(event, req.user?.id)),
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
      ...sanitizeEventResponse(event, req.user?.id),
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
  const events = getManagedEvents(req.user);
  const resolvedEvents = await events
    .populate("committeeId", "name")
    .populate("departmentIds", "name code")
    .sort({ createdAt: -1 })
    .select("-seatMap");

  return res.status(200).json({
    success: true,
    events: resolvedEvents.map((event) => sanitizeEventResponse(event, req.user?.id)),
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
    event: sanitizeEventResponse(event, req.user?.id),
    message: "Event fetched successfully !",
  });
});

const markInterestedInEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const normalizedRole = normalizeRole(req.user?.role);

  if (normalizedRole !== ROLE_VALUES.STUDENT) {
    return res.status(403).json({
      success: false,
      message: "Only students can mark interest in events",
    });
  }

  const event = await Event.findById(id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  if (!ensureEventVisibleOrManageable(req, res, event)) {
    return;
  }

  if (event.isFinalized) {
    return res.status(400).json({
      success: false,
      message: "This event is already confirmed. You can register from the event page.",
    });
  }

  event.interestedUsers = Array.from(
    new Set([...(event.interestedUsers || []).map((userId) => userId.toString()), req.user.id])
  );
  await event.save();

  return res.status(200).json({
    success: true,
    event: sanitizeEventResponse(event, req.user?.id),
    message: "You will be notified when this event is confirmed",
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
    visibilityScope = "department",
  } = req.body;

  const normalizedVisibilityScope = normalizeVisibilityScope(visibilityScope);

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
    !committeeId
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

  let scopedDepartmentIds;

  try {
    scopedDepartmentIds = normalizeScopedDepartmentIds({
      visibilityScope: normalizedVisibilityScope,
      departmentIds,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
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
    departmentIds: scopedDepartmentIds,
    tentativeDate: eventDateTime[0],
    finalDate: eventDateTime[0],
    isFinalized: true,
    visibilityScope: normalizedVisibilityScope,
    lifecycleState: "registration_open",
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
  const requestedVisibilityScope = Object.prototype.hasOwnProperty.call(updateData, "visibilityScope")
    ? updateData.visibilityScope
    : event.visibilityScope;
  const normalizedVisibilityScope = normalizeVisibilityScope(requestedVisibilityScope);

  updateData.visibilityScope = normalizedVisibilityScope;

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

  if (
    Object.prototype.hasOwnProperty.call(req.body, "departmentIds") ||
    Object.prototype.hasOwnProperty.call(req.body, "visibilityScope")
  ) {
    try {
      updateData.departmentIds = normalizeScopedDepartmentIds({
        visibilityScope: normalizedVisibilityScope,
        departmentIds: Object.prototype.hasOwnProperty.call(req.body, "departmentIds")
          ? req.body.departmentIds
          : event.departmentIds,
        fallbackDepartmentIds: event.departmentIds,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
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

  const shouldNotifyInterestedUsers = !event.isFinalized && Boolean(normalizedUpdateData.isFinalized);

  const updatedEvent = await Event.findByIdAndUpdate(
    id,
    { $set: normalizedUpdateData },
    { new: true }
  )
    .populate("committeeId", "name")
    .populate("departmentIds", "name code");

  if (shouldNotifyInterestedUsers) {
    notifyInterestedUsersForConfirmedEvent(updatedEvent).catch((emailError) => {
      console.error("Error notifying interested students:", emailError);
    });
  }

  return res.status(200).json({
    success: true,
    event: sanitizeEventResponse(updatedEvent, req.user?.id),
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
  const events = getManagedEvents(req.user);
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

  await Promise.all(
    bookings.map(async (booking) => {
      const refreshedQr = await getSignedTicketQrForBooking(booking._id);

      if (booking.ticket_qr !== refreshedQr) {
        booking.ticket_qr = refreshedQr;
        await booking.save();
      }
    })
  );

  return res.status(200).json({
    success: true,
    bookings,
    message: bookings.length ? "Your bookings fetched successfully" : "You have not booked any events",
  });
});

const getOrganizerSummary = asyncHandler(async (req, res) => {
  const events = getManagedEvents(req.user);
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
  const qrContent = typeof data === "string" ? data : JSON.stringify(data);
  return QRCode.toDataURL(qrContent, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 640,
  });
};

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
  const qrCode = await getSignedTicketQrForBooking(bookingId);

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

  let parsedTicket;

  try {
    parsedTicket = parseTicketPayload(qrData);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Ticket QR code is invalid",
    });
  }

  const { payload: ticketPayload, format: ticketFormat } = parsedTicket;

  const { booking, resolution } = await findBookingForTicketPayload({
    bookingId: ticketPayload.bookingId,
    eventId: ticketPayload.eventId,
    userId: ticketPayload.userId,
    paymentId: ticketPayload.paymentId,
    seats: ticketPayload.seats,
  });

  if (!booking) {
    if (resolution === "ambiguous_fallback") {
      return res.status(409).json({
        success: false,
        message: "This QR matches multiple bookings. Please open the original ticket and rescan its latest QR code.",
      });
    }

    return res.status(404).json({
      success: false,
      message:
        ticketFormat === "legacy"
          ? "This QR belongs to an older demo ticket that no longer matches a live booking record"
          : "Booking not found for this ticket",
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
  const resolvedBookingId = booking._id?.toString();

  if (eventId && bookingEventId !== eventId) {
    return res.status(400).json({
      success: false,
      message: "This ticket belongs to a different event",
      booking: buildCheckInBookingSummary(booking),
    });
  }

  if (ticketPayload.eventId && ticketPayload.eventId !== bookingEventId) {
    return res.status(400).json({
      success: false,
      message: "Ticket event data does not match the stored booking",
      booking: buildCheckInBookingSummary(booking),
    });
  }

  if (ticketPayload.userId && ticketPayload.userId !== bookingUserId) {
    return res.status(400).json({
      success: false,
      message: "Ticket attendee data does not match the stored booking",
      booking: buildCheckInBookingSummary(booking),
    });
  }

  if (ticketFormat === "signed_compact") {
    if (ticketPayload.v !== QR_SIGNING_VERSION || ticketPayload.bookingId !== resolvedBookingId) {
      return res.status(400).json({
        success: false,
        message: "Ticket data does not match the stored booking",
        booking: buildCheckInBookingSummary(booking),
      });
    }
  } else if (ticketFormat === "signed_json") {
    if (
      ticketPayload.v !== LEGACY_QR_SIGNING_VERSION ||
      ticketPayload.bookingId !== resolvedBookingId ||
      ticketPayload.paymentId !== booking.payment_id
    ) {
      return res.status(400).json({
        success: false,
        message: "Ticket data does not match the stored booking",
        booking: buildCheckInBookingSummary(booking),
      });
    }
  }

  if (booking.ticket_redeem) {
    return res.status(409).json({
      success: false,
      message: "Ticket has already been redeemed",
      booking: buildCheckInBookingSummary(booking),
    });
  }

  booking.ticket_redeem = true;
  booking.ticket_redeemedAt = new Date();
  await booking.save();

  return res.status(200).json({
    success: true,
    message:
      ticketFormat === "legacy"
        ? "Legacy ticket validated and redeemed successfully"
        : "Ticket validated and redeemed successfully",
    booking: buildCheckInBookingSummary(booking),
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
  markInterestedInEvent,
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
};
