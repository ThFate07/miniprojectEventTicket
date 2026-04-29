import { Event } from "../models/events.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { eventMarketingFormat, mail } from "../utils/email.js";
import { canManageEvent, normalizeRole, ROLE_VALUES } from "../utils/eventAccess.js";

const getEmailList = asyncHandler(async (req, res) => {
  const normalizedRole = normalizeRole(req.user?.role);
  const query =
    normalizedRole === ROLE_VALUES.PLATFORM_ADMIN
      ? { role: ROLE_VALUES.STUDENT }
      : { role: ROLE_VALUES.STUDENT, collegeId: req.user.collegeId };
  const users = await User.find(query).select("email");
  return res.status(200).send({
    message: "Emails of students",
    success: true,
    users,
  });
});
const sendBulkEmails = asyncHandler(async (req, res) => {
  const { event_id, email } = req.body;
  const event = await Event.findById(event_id); // Fixed: Changed 'id' to 'event_id'

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found"
    });
  }

  if (!canManageEvent(req.user, event)) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to market this event",
    });
  }

  const content = {
    to: email,
    subject: `New Event: ${event.title}`,
    html: eventMarketingFormat(event),
  };

  const result = await mail(content);
  
  if (!result) {
    return res.status(500).json({
      success: false,
      message: "Failed to send email"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Email sent successfully"
  });
});
export { sendBulkEmails, getEmailList };
