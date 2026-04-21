import { Router } from "express";
import {
  acceptInviteCode,
  createInviteCode,
  inviteByEmail,
  validateInviteCode,
} from "../controllers/invite.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { ROLE_VALUES } from "../utils/eventAccess.js";

const router = Router();

router.post(
  "/create",
  requireAuth,
  requireRole(ROLE_VALUES.PLATFORM_ADMIN, ROLE_VALUES.COLLEGE_ADMIN),
  createInviteCode
);
router.post("/validate", requireAuth, validateInviteCode);
router.post("/accept", requireAuth, acceptInviteCode);
router.post(
  "/email",
  requireAuth,
  requireRole(ROLE_VALUES.PLATFORM_ADMIN, ROLE_VALUES.COLLEGE_ADMIN),
  inviteByEmail
);

export default router;
