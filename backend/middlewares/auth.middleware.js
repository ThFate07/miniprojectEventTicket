import jwt from 'jsonwebtoken'
import { canManageCollege, normalizeRole, ROLE_VALUES, userHasTenantAssignment } from '../utils/eventAccess.js';

export const requireAuth = (req , res , next) => {
    const { token } = req.cookies;
    if(!token){
        return res.status(401).send({message : "You need to login first" , success : false});
    }
    jwt.verify(token , process.env.JWT_SECRET , (err , decode)=> {
        if(err){
            return res.status(401).send({message : "Token not valid , Please Contact Admin" , success : false});
        }
        req.user = {
          ...decode,
          role: normalizeRole(decode.role),
        };
        next();
    })
}

export const requireRole = (...roles) => (req, res, next) => {
  const allowedRoles = roles.map((role) => normalizeRole(role));

  if (!req.user) {
    return res.status(401).send({
      message: "You need to login first",
      success: false,
    });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).send({
      message: "Unauthorized Access",
      success: false,
    });
  }

  next();
};

export const requireTenantMember = (req, res, next) => {
  if (userHasTenantAssignment(req.user)) {
    return next();
  }

  return res.status(403).send({
    message: "Join your college first to access this feature",
    success: false,
  });
};

export const requireCollegeScope = (req, res, next) => {
  const collegeId = req.params.collegeId || req.body.collegeId || req.user?.collegeId;

  if (req.user?.role === ROLE_VALUES.PLATFORM_ADMIN || canManageCollege(req.user, collegeId)) {
    return next();
  }

  return res.status(403).send({
    message: "You do not have access to this college",
    success: false,
  });
};

export const authenticate = requireAuth;
export const authenticateOrganizer = [requireAuth, requireRole(ROLE_VALUES.ORGANIZER, ROLE_VALUES.COLLEGE_ADMIN, ROLE_VALUES.PLATFORM_ADMIN)];
export const authenticateAttendee = [requireAuth, requireRole(ROLE_VALUES.STUDENT)];
