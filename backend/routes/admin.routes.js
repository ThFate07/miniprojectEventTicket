import { Router } from "express";
import {
  createGroup,
  getAdminDashboardSummary,
  getEventsForAdmin,
  getGroups,
  setEventGroupCode,
} from "../controllers/admin.controller.js";
import { authenticate, authenticateAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate, authenticateAdmin);

router.get("/dashboard-summary", getAdminDashboardSummary);
router.get("/groups", getGroups);
router.post("/groups", createGroup);
router.get("/events", getEventsForAdmin);
router.patch("/events/:id/group-code", setEventGroupCode);

export default router;
