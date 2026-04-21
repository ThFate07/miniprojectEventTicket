import { Booking } from "../models/bookings.model.js";
import { College } from "../models/college.model.js";
import { Committee } from "../models/committee.model.js";
import { Department } from "../models/department.model.js";
import { Event } from "../models/events.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeRole, ROLE_VALUES } from "../utils/eventAccess.js";

const buildScope = (user) => {
  const role = normalizeRole(user?.role);

  if (role === ROLE_VALUES.PLATFORM_ADMIN) {
    return {
      role,
      collegeFilter: {},
      userFilter: {},
      eventFilter: {},
      label: "Platform-wide",
    };
  }

  return {
    role,
    collegeFilter: { _id: user.collegeId },
    userFilter: { collegeId: user.collegeId },
    eventFilter: { collegeId: user.collegeId },
    label: "College workspace",
  };
};

const serializeRoleCounts = (roleCounts) =>
  Object.values(ROLE_VALUES).reduce((acc, role) => {
    acc[role] = roleCounts.find((entry) => entry._id === role)?.count || 0;
    return acc;
  }, {});

const getAdminDashboard = asyncHandler(async (req, res) => {
  const scope = buildScope(req.user);
  const managedEvents = await Event.find(scope.eventFilter).select("_id lifecycleState totalRevenue totalBookings");
  const eventIds = managedEvents.map((event) => event._id);

  const [
    colleges,
    departments,
    committees,
    totalUsers,
    platformAdmins,
    collegeAdmins,
    organizers,
    students,
    bookings,
    recentUsers,
    recentEvents,
  ] = await Promise.all([
    College.countDocuments(scope.collegeFilter),
    Department.countDocuments({ ...("collegeId" in scope.eventFilter ? scope.eventFilter : {}), isActive: true }),
    Committee.countDocuments({ ...("collegeId" in scope.eventFilter ? scope.eventFilter : {}), isActive: true }),
    User.countDocuments(scope.userFilter),
    User.countDocuments({ ...scope.userFilter, role: ROLE_VALUES.PLATFORM_ADMIN }),
    User.countDocuments({ ...scope.userFilter, role: ROLE_VALUES.COLLEGE_ADMIN }),
    User.countDocuments({ ...scope.userFilter, role: ROLE_VALUES.ORGANIZER }),
    User.countDocuments({ ...scope.userFilter, role: ROLE_VALUES.STUDENT }),
    Booking.countDocuments({ event_id: { $in: eventIds } }),
    User.find(scope.userFilter)
      .sort({ _id: -1 })
      .limit(6)
      .select("fullName username email role collegeId departmentId inviteStatus")
      .populate("collegeId", "name code")
      .populate("departmentId", "name code"),
    Event.find(scope.eventFilter)
      .sort({ createdAt: -1 })
      .limit(6)
      .select("title lifecycleState visibilityScope totalBookings totalRevenue collegeId committeeId")
      .populate("collegeId", "name code")
      .populate("committeeId", "name"),
  ]);

  const totals = managedEvents.reduce(
    (acc, entry) => ({
      totalRevenue: acc.totalRevenue + (entry.totalRevenue || 0),
      totalEventBookings: acc.totalEventBookings + (entry.totalBookings || 0),
    }),
    { totalRevenue: 0, totalEventBookings: 0 }
  );
  const eventsByLifecycle = managedEvents.reduce((acc, event) => {
    const state = event.lifecycleState || "tentative";
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});
  const usersByRole = serializeRoleCounts([
    { _id: ROLE_VALUES.PLATFORM_ADMIN, count: platformAdmins },
    { _id: ROLE_VALUES.COLLEGE_ADMIN, count: collegeAdmins },
    { _id: ROLE_VALUES.ORGANIZER, count: organizers },
    { _id: ROLE_VALUES.STUDENT, count: students },
  ]);

  return res.status(200).json({
    success: true,
    message: "Admin dashboard fetched",
    scope: {
      role: scope.role,
      label: scope.label,
    },
    counts: {
      colleges,
      departments,
      committees,
      users: totalUsers,
      events: managedEvents.length,
      bookings,
      totalRevenue: totals.totalRevenue,
      totalEventBookings: totals.totalEventBookings,
      usersByRole,
      eventsByLifecycle,
    },
    recentUsers,
    recentEvents,
  });
});

const getAdminDirectory = asyncHandler(async (req, res) => {
  const scope = buildScope(req.user);
  const collegeQuery = scope.role === ROLE_VALUES.PLATFORM_ADMIN ? { isActive: true } : { _id: req.user.collegeId };
  const departmentQuery =
    scope.role === ROLE_VALUES.PLATFORM_ADMIN ? { isActive: true } : { collegeId: req.user.collegeId, isActive: true };
  const committeeQuery =
    scope.role === ROLE_VALUES.PLATFORM_ADMIN ? { isActive: true } : { collegeId: req.user.collegeId, isActive: true };

  const [colleges, departments, committees] = await Promise.all([
    College.find(collegeQuery).sort({ name: 1 }).select("name code"),
    Department.find(departmentQuery).sort({ name: 1 }).select("name code collegeId"),
    Committee.find(committeeQuery).sort({ name: 1 }).select("name collegeId departmentIds memberIds"),
  ]);

  return res.status(200).json({
    success: true,
    message: "Admin directory fetched",
    colleges,
    departments,
    committees,
  });
});

export { getAdminDashboard, getAdminDirectory };
