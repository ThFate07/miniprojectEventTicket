import { Router } from "express";
import { authenticate, authenticateOrganizer, requireRole } from "../middlewares/auth.middleware.js";
import { bookTicket, checkSeatsAvailability, deleteMyEvent, downloadTicketPdf, getBookings, getEventById, getEvents, getEventSeatsAndTimings, getMyBookings, getMyEventById, getMyEvents, postEvent, updateMyEvent , getOrganizerSummary, getBookedEvents, lockSeat, unlockSeat, getSeatLocks, checkSeatsAvailabilityWithLocks, validateTicketEntry } from "../controllers/events.controller.js";
import { geminiChatBot } from "../controllers/gemini.controller.js";
import { ROLE_VALUES } from "../utils/eventAccess.js";

const router = Router();
router.get('/get-events' , authenticate , getEvents);
router.get('/get-events/:id' , authenticate , getEventById);
router.post('/add-events' , authenticate , postEvent);
router.get('/get-seats-times/:id' , authenticate , getEventSeatsAndTimings);
router.get('/get-my-bookings' , authenticate , getMyBookings)
router.get('/ticket-pdf/:bookingId' , authenticate , downloadTicketPdf)
router.get('/get-my-events' , authenticate , getMyEvents);
router.get('/get-my-events/:id' , authenticate , getMyEventById);
router.post('/update-my-event/:id' , authenticate , updateMyEvent);
router.delete('/delete-my-event/:id' , authenticate , deleteMyEvent);
router.get('/get-bookings' , authenticate , getBookings);
router.get('/get-booked-events' , authenticate , getBookedEvents);
router.get('/getOrganizerSummary' ,authenticate , getOrganizerSummary );
router.post('/check-seats' , authenticate, checkSeatsAvailability);
router.post('/check-seats-with-locks' , authenticate , checkSeatsAvailabilityWithLocks);
router.post('/lock-seat' , authenticate , lockSeat);
router.post('/unlock-seat' , authenticate , unlockSeat);
router.get('/seat-locks/:eventId' , authenticate , getSeatLocks);
router.post('/book-ticket' , authenticate , bookTicket);
router.post('/validate-ticket-entry' , authenticateOrganizer , validateTicketEntry);
router.post('/ask' , authenticate, geminiChatBot)
export default router;
