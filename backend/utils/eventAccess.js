import mongoose from "mongoose";

export const ROLE_VALUES = Object.freeze({
  PLATFORM_ADMIN: "platform_admin",
  COLLEGE_ADMIN: "college_admin",
  ORGANIZER: "organizer",
  STUDENT: "student",
});

const LEGACY_ROLE_MAP = Object.freeze({
  organizer: ROLE_VALUES.ORGANIZER,
  attendee: ROLE_VALUES.STUDENT,
  student: ROLE_VALUES.STUDENT,
  college_admin: ROLE_VALUES.COLLEGE_ADMIN,
  platform_admin: ROLE_VALUES.PLATFORM_ADMIN,
});

export const normalizeRole = (role) => {
  if (!role || typeof role !== "string") {
    return ROLE_VALUES.STUDENT;
  }

  return LEGACY_ROLE_MAP[role.trim().toLowerCase()] || ROLE_VALUES.STUDENT;
};

export const normalizeUserForAccess = (user) => {
  if (!user) {
    return null;
  }

  return {
    ...user,
    role: normalizeRole(user.role),
  };
};

export const toObjectIdString = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === "object" && value._id) {
    return toObjectIdString(value._id);
  }

  return String(value);
};

export const userHasTenantAssignment = (user) =>
  Boolean(toObjectIdString(user?.collegeId) && toObjectIdString(user?.departmentId));

export const isPrivilegedRole = (role) =>
  [ROLE_VALUES.PLATFORM_ADMIN, ROLE_VALUES.COLLEGE_ADMIN].includes(normalizeRole(role));

export const canManageCollege = (user, collegeId) => {
  const normalizedUser = normalizeUserForAccess(user);
  const targetCollegeId = toObjectIdString(collegeId);

  if (!normalizedUser || !targetCollegeId) {
    return false;
  }

  if (normalizedUser.role === ROLE_VALUES.PLATFORM_ADMIN) {
    return true;
  }

  return (
    normalizedUser.role === ROLE_VALUES.COLLEGE_ADMIN &&
    toObjectIdString(normalizedUser.collegeId) === targetCollegeId
  );
};

export const userCommitteeIds = (user) =>
  Array.isArray(user?.committeeIds)
    ? user.committeeIds.map((committeeId) => toObjectIdString(committeeId)).filter(Boolean)
    : [];

export const canManageCommittee = (user, committee) => {
  const normalizedUser = normalizeUserForAccess(user);
  const committeeId = toObjectIdString(committee?._id || committee);
  const committeeCollegeId = toObjectIdString(committee?.collegeId);

  if (!normalizedUser || !committeeId) {
    return false;
  }

  if (normalizedUser.role === ROLE_VALUES.PLATFORM_ADMIN) {
    return true;
  }

  if (
    normalizedUser.role === ROLE_VALUES.COLLEGE_ADMIN &&
    committeeCollegeId &&
    toObjectIdString(normalizedUser.collegeId) === committeeCollegeId
  ) {
    return true;
  }

  return (
    normalizedUser.role === ROLE_VALUES.ORGANIZER &&
    userCommitteeIds(normalizedUser).includes(committeeId)
  );
};

export const canManageEvent = (user, event) => {
  const normalizedUser = normalizeUserForAccess(user);

  if (!normalizedUser || !event) {
    return false;
  }

  if (normalizedUser.role === ROLE_VALUES.PLATFORM_ADMIN) {
    return true;
  }

  const eventCollegeId = toObjectIdString(event.collegeId);
  const eventCommitteeId = toObjectIdString(event.committeeId);
  const eventOrganizerId = toObjectIdString(event.organizer);

  if (
    normalizedUser.role === ROLE_VALUES.COLLEGE_ADMIN &&
    eventCollegeId &&
    eventCollegeId === toObjectIdString(normalizedUser.collegeId)
  ) {
    return true;
  }

  if (
    normalizedUser.role === ROLE_VALUES.ORGANIZER &&
    eventCommitteeId &&
    userCommitteeIds(normalizedUser).includes(eventCommitteeId)
  ) {
    return true;
  }

  return (
    normalizedUser.role === ROLE_VALUES.ORGANIZER &&
    eventOrganizerId === toObjectIdString(normalizedUser.id || normalizedUser._id)
  );
};

export const isEventVisibleToUser = (user, event) => {
  const normalizedUser = normalizeUserForAccess(user);

  if (!normalizedUser || !event) {
    return false;
  }

  if (canManageEvent(normalizedUser, event)) {
    return true;
  }

  if (!userHasTenantAssignment(normalizedUser)) {
    return false;
  }

  const scope = event.visibilityScope || "global";

  if (scope === "global") {
    return true;
  }

  const userCollegeId = toObjectIdString(normalizedUser.collegeId);
  const userDepartmentId = toObjectIdString(normalizedUser.departmentId);
  const eventCollegeId = toObjectIdString(event.collegeId);
  const eventDepartmentIds = Array.isArray(event.departmentIds)
    ? event.departmentIds.map((departmentId) => toObjectIdString(departmentId)).filter(Boolean)
    : [];

  if (scope === "college") {
    return Boolean(userCollegeId && userCollegeId === eventCollegeId);
  }

  if (scope === "department") {
    return Boolean(userDepartmentId && eventDepartmentIds.includes(userDepartmentId));
  }

  return false;
};

export const canRegisterForEvent = (user, event) =>
  userHasTenantAssignment(user) && isEventVisibleToUser(user, event);
