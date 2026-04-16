import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Event } from "../models/events.model.js";
import { Group } from "../models/group.model.js";
import { Booking } from "../models/bookings.model.js";

const getAdminDashboardSummary = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalOrganizers,
    totalAttendees,
    totalEvents,
    activeEvents,
    completedEvents,
    totalGroups,
    totalGroupEvents,
    revenueAgg,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: "Organizer" }),
    User.countDocuments({ role: "Attendee" }),
    Event.countDocuments({}),
    Event.countDocuments({ status: "active" }),
    Event.countDocuments({ status: "completed" }),
    Group.countDocuments({}),
    Event.countDocuments({ groupCode: { $exists: true, $ne: null, $ne: "" } }),
    Booking.aggregate([{ $group: { _id: null, totalRevenue: { $sum: "$paymentAmt" } } }]),
  ]);

  const totalRevenue = revenueAgg?.[0]?.totalRevenue || 0;

  return res.status(200).json({
    success: true,
    message: "Admin summary fetched successfully",
    summary: {
      totalUsers,
      totalOrganizers,
      totalAttendees,
      totalEvents,
      activeEvents,
      completedEvents,
      pendingEvents: Math.max(totalEvents - activeEvents - completedEvents, 0),
      totalRevenue,
      totalGroups,
      totalGroupEvents,
    },
  });
});

const getGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({}).sort({ createdAt: -1 }).lean();

  const enrichedGroups = await Promise.all(
    groups.map(async (group) => {
      const groupEventCount = await Event.countDocuments({ groupCode: group.code });
      return {
        ...group,
        memberCount: Array.isArray(group.members) ? group.members.length : 0,
        groupEventCount,
      };
    })
  );

  return res.status(200).json({
    success: true,
    message: "Groups fetched successfully",
    groups: enrichedGroups,
  });
});

const createGroup = asyncHandler(async (req, res) => {
  const { name, code } = req.body;

  if (!name || !code) {
    return res.status(400).json({
      success: false,
      message: "Group name and code are required",
    });
  }

  const normalizedCode = String(code).trim().toUpperCase();

  const existing = await Group.findOne({ code: normalizedCode });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: "Group code already exists",
    });
  }

  const group = await Group.create({
    name: String(name).trim(),
    code: normalizedCode,
  });

  return res.status(201).json({
    success: true,
    message: "Group created successfully",
    group,
  });
});

const getEventsForAdmin = asyncHandler(async (req, res) => {
  const events = await Event.find({})
    .select("title status eventType eventDateTime location groupCode")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    message: "Events fetched successfully",
    events,
  });
});

const setEventGroupCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { groupCode } = req.body;

  if (groupCode !== null && groupCode !== undefined && typeof groupCode !== "string") {
    return res.status(400).json({
      success: false,
      message: "groupCode must be a string or null",
    });
  }

  let normalizedGroupCode = null;
  if (typeof groupCode === "string" && groupCode.trim()) {
    normalizedGroupCode = groupCode.trim().toUpperCase();
    const group = await Group.findOne({ code: normalizedGroupCode });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group code does not exist",
      });
    }
  }

  const event = await Event.findByIdAndUpdate(
    id,
    { $set: { groupCode: normalizedGroupCode } },
    { new: true }
  ).select("title groupCode");

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Event group code updated successfully",
    event,
  });
});

export {
  getAdminDashboardSummary,
  getGroups,
  createGroup,
  getEventsForAdmin,
  setEventGroupCode,
};
