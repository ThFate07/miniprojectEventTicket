export const ROLE_VALUES = Object.freeze({
  PLATFORM_ADMIN: 'platform_admin',
  COLLEGE_ADMIN: 'college_admin',
  ORGANIZER: 'organizer',
  STUDENT: 'student',
});

export const normalizeRole = (role) => {
  if (!role || typeof role !== 'string') {
    return ROLE_VALUES.STUDENT;
  }

  const normalized = role.trim().toLowerCase();

  if (normalized === 'attendee') {
    return ROLE_VALUES.STUDENT;
  }

  if (normalized === 'organizer') {
    return ROLE_VALUES.ORGANIZER;
  }

  return normalized;
};

export const isOrganizerRole = (role) =>
  [ROLE_VALUES.ORGANIZER, ROLE_VALUES.COLLEGE_ADMIN, ROLE_VALUES.PLATFORM_ADMIN].includes(normalizeRole(role));

export const isStudentRole = (role) => normalizeRole(role) === ROLE_VALUES.STUDENT;
export const isPrivilegedRole = (role) =>
  [ROLE_VALUES.PLATFORM_ADMIN, ROLE_VALUES.COLLEGE_ADMIN].includes(normalizeRole(role));

export const toObjectIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return toObjectIdString(value._id);
  return String(value);
};

export const userHasTenantAssignment = (user) =>
  Boolean(toObjectIdString(user?.collegeId) && toObjectIdString(user?.departmentId));

export const isEventVisibleToUser = (user, event) => {
  if (!user || !event) {
    return false;
  }

  if (!userHasTenantAssignment(user)) {
    return false;
  }

  const scope = event.visibilityScope || 'global';

  if (scope === 'global') {
    return true;
  }

  const userCollegeId = toObjectIdString(user.collegeId);
  const userDepartmentId = toObjectIdString(user.departmentId);
  const eventCollegeId = toObjectIdString(event.collegeId);
  const eventDepartmentIds = Array.isArray(event.departmentIds)
    ? event.departmentIds.map((departmentId) => toObjectIdString(departmentId)).filter(Boolean)
    : [];

  if (scope === 'college') {
    return Boolean(userCollegeId && userCollegeId === eventCollegeId);
  }

  if (scope === 'department') {
    return Boolean(userDepartmentId && eventDepartmentIds.includes(userDepartmentId));
  }

  return false;
};

export const userCommitteeIds = (user) =>
  Array.isArray(user?.committeeIds)
    ? user.committeeIds.map((committeeId) => toObjectIdString(committeeId)).filter(Boolean)
    : [];

export const canManageEvent = (user, event) => {
  if (!user || !event) {
    return false;
  }

  const role = normalizeRole(user.role);

  if (role === ROLE_VALUES.PLATFORM_ADMIN) {
    return true;
  }

  const eventCollegeId = toObjectIdString(event.collegeId);
  const eventCommitteeId = toObjectIdString(event.committeeId);
  const eventOrganizerId = toObjectIdString(event.organizer);
  const userCollegeId = toObjectIdString(user.collegeId);
  const userId = toObjectIdString(user.id || user._id);

  if (role === ROLE_VALUES.COLLEGE_ADMIN && eventCollegeId && userCollegeId === eventCollegeId) {
    return true;
  }

  if (role === ROLE_VALUES.ORGANIZER && eventCommitteeId && userCommitteeIds(user).includes(eventCommitteeId)) {
    return true;
  }

  return role === ROLE_VALUES.ORGANIZER && eventOrganizerId === userId;
};

export const canRegisterForEvent = (user, event) =>
  userHasTenantAssignment(user) && isEventVisibleToUser(user, event);

export const getPostLoginRoute = (user) => {
  const role = normalizeRole(user?.role);

  if (isPrivilegedRole(role)) {
    return '/admin';
  }

  if (isOrganizerRole(role)) {
    return '/organizer/dashboard';
  }

  if (user && user.hasTenantAccess === false) {
    return '/profile';
  }

  return '/';
};
