import { Router } from "express";
import { getAdminDashboard, getAdminDirectory } from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { ROLE_VALUES } from "../utils/eventAccess.js";

const router = Router();

router.use(requireAuth, requireRole(ROLE_VALUES.PLATFORM_ADMIN, ROLE_VALUES.COLLEGE_ADMIN));
router.get("/dashboard", getAdminDashboard);
router.get("/directory", getAdminDirectory);

export default router;
