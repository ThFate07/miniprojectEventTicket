import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import QRCode from "qrcode";

import { connectDB } from "../utils/connectDB.js";
import { loadEnv } from "../utils/loadEnv.js";
import { College } from "../models/college.model.js";
import { Department } from "../models/department.model.js";
import { Committee } from "../models/committee.model.js";
import { InviteCode } from "../models/inviteCode.model.js";
import { User } from "../models/user.model.js";
import { Event } from "../models/events.model.js";
import { Booking } from "../models/bookings.model.js";
import { Payment } from "../models/payment.model.js";
import { SeatLock } from "../models/seatLock.model.js";
import Review from "../models/review.model.js";
import { ROLE_VALUES } from "../utils/eventAccess.js";

loadEnv();

const PASSWORD = "password123";
const FREE_PAYMENT_ID = "FREE";

const buildDate = (daysAhead, hour = 10, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const makeGeneralSeatMap = (count) =>
  Array.from({ length: count }, (_, index) => ({
    seatLabel: `GA${index + 1}`,
    isBooked: false,
  }));

const makeGridSeatMap = (rows, cols) => {
  const seatMap = [];
  for (let row = 0; row < rows; row += 1) {
    const rowLabel = String.fromCharCode(65 + row);
    for (let col = 1; col <= cols; col += 1) {
      seatMap.push({
        seatLabel: `${rowLabel}${col}`,
        isBooked: false,
      });
    }
  }
  return seatMap;
};

const createTicketQr = async (payload) => QRCode.toDataURL(JSON.stringify(payload));

const buildUserProfile = ({
  fullName,
  username,
  email,
  studentId,
  phoneNumber,
  collegeEmail = "",
  ...rest
}) => ({
  fullName,
  username,
  email,
  studentId,
  phoneNumber,
  collegeEmail,
  ...rest,
});

const seed = async () => {
  await connectDB();

  await Promise.all([
    Booking.deleteMany({}),
    Payment.deleteMany({}),
    SeatLock.deleteMany({}),
    Review.deleteMany({}),
    Event.deleteMany({}),
    InviteCode.deleteMany({}),
    Committee.deleteMany({}),
    Department.deleteMany({}),
    User.deleteMany({}),
    College.deleteMany({}),
  ]);

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  const [northvaleCollege, riversideCollege] = await College.create([
    {
      name: "Northvale Institute of Technology",
      code: "northvale-tech",
      isActive: true,
    },
    {
      name: "Riverside College of Arts & Science",
      code: "riverside-arts",
      isActive: true,
    },
  ]);

  const [
    northvaleCse,
    northvaleEce,
    northvaleMgmt,
    riversideMedia,
    riversideCommerce,
  ] = await Department.create([
    {
      name: "Computer Science",
      code: "cse",
      collegeId: northvaleCollege._id,
      isActive: true,
    },
    {
      name: "Electronics",
      code: "ece",
      collegeId: northvaleCollege._id,
      isActive: true,
    },
    {
      name: "Management Studies",
      code: "mba",
      collegeId: northvaleCollege._id,
      isActive: true,
    },
    {
      name: "Media Studies",
      code: "media",
      collegeId: riversideCollege._id,
      isActive: true,
    },
    {
      name: "Commerce",
      code: "commerce",
      collegeId: riversideCollege._id,
      isActive: true,
    },
  ]);

  const users = await User.create([
    buildUserProfile({
      fullName: "Platform Admin",
      username: "Platform Admin",
      email: "platform.admin@bookmyevent.test",
      studentId: "PLAT-0001",
      phoneNumber: "9876500101",
      collegeEmail: "platform.admin@bookmyevent.test",
      password: hashedPassword,
      role: ROLE_VALUES.PLATFORM_ADMIN,
      inviteStatus: "accepted",
    }),
    buildUserProfile({
      fullName: "Northvale Admin",
      username: "Northvale Admin",
      email: "college.admin@northvale.test",
      studentId: "NV-ADM-0001",
      phoneNumber: "9876500102",
      collegeEmail: "college.admin@northvale.test",
      password: hashedPassword,
      role: ROLE_VALUES.COLLEGE_ADMIN,
      collegeId: northvaleCollege._id,
      departmentId: northvaleCse._id,
      inviteStatus: "accepted",
    }),
    buildUserProfile({
      fullName: "Riverside Admin",
      username: "Riverside Admin",
      email: "college.admin@riverside.test",
      studentId: "RS-ADM-0001",
      phoneNumber: "9876500103",
      collegeEmail: "college.admin@riverside.test",
      password: hashedPassword,
      role: ROLE_VALUES.COLLEGE_ADMIN,
      collegeId: riversideCollege._id,
      departmentId: riversideMedia._id,
      inviteStatus: "accepted",
    }),
    buildUserProfile({
      fullName: "Aarav Organizer",
      username: "Aarav Organizer",
      email: "organizer.techfest@northvale.test",
      studentId: "NV-ORG-0001",
      phoneNumber: "9876500104",
      collegeEmail: "organizer.techfest@northvale.test",
      password: hashedPassword,
      role: ROLE_VALUES.ORGANIZER,
      collegeId: northvaleCollege._id,
      departmentId: northvaleCse._id,
      inviteStatus: "accepted",
    }),
    buildUserProfile({
      fullName: "Nisha Organizer",
      username: "Nisha Organizer",
      email: "organizer.cultural@northvale.test",
      studentId: "NV-ORG-0002",
      phoneNumber: "9876500105",
      collegeEmail: "organizer.cultural@northvale.test",
      password: hashedPassword,
      role: ROLE_VALUES.ORGANIZER,
      collegeId: northvaleCollege._id,
      departmentId: northvaleEce._id,
      inviteStatus: "accepted",
    }),
    buildUserProfile({
      fullName: "Riya Organizer",
      username: "Riya Organizer",
      email: "organizer.media@riverside.test",
      studentId: "RS-ORG-0001",
      phoneNumber: "9876500106",
      collegeEmail: "organizer.media@riverside.test",
      password: hashedPassword,
      role: ROLE_VALUES.ORGANIZER,
      collegeId: riversideCollege._id,
      departmentId: riversideMedia._id,
      inviteStatus: "accepted",
    }),
    buildUserProfile({
      fullName: "Kunal Student",
      username: "Kunal Student",
      email: "student.cse@northvale.test",
      studentId: "NV-CSE-2026-001",
      phoneNumber: "9876500107",
      collegeEmail: "student.cse@northvale.test",
      password: hashedPassword,
      role: ROLE_VALUES.STUDENT,
      collegeId: northvaleCollege._id,
      departmentId: northvaleCse._id,
      inviteStatus: "accepted",
    }),
    buildUserProfile({
      fullName: "Sneha Student",
      username: "Sneha Student",
      email: "student.ece@northvale.test",
      studentId: "NV-ECE-2026-001",
      phoneNumber: "9876500108",
      collegeEmail: "student.ece@northvale.test",
      password: hashedPassword,
      role: ROLE_VALUES.STUDENT,
      collegeId: northvaleCollege._id,
      departmentId: northvaleEce._id,
      inviteStatus: "accepted",
    }),
    buildUserProfile({
      fullName: "Meera Student",
      username: "Meera Student",
      email: "student.media@riverside.test",
      studentId: "RS-MEDIA-2026-001",
      phoneNumber: "9876500109",
      collegeEmail: "student.media@riverside.test",
      password: hashedPassword,
      role: ROLE_VALUES.STUDENT,
      collegeId: riversideCollege._id,
      departmentId: riversideMedia._id,
      inviteStatus: "accepted",
    }),
    buildUserProfile({
      fullName: "Pending Student",
      username: "Pending Student",
      email: "pending.student@test.com",
      studentId: "PENDING-0001",
      phoneNumber: "9876500110",
      password: hashedPassword,
      role: ROLE_VALUES.STUDENT,
      inviteStatus: "pending",
    }),
  ]);

  const [
    platformAdmin,
    northvaleAdmin,
    riversideAdmin,
    techFestOrganizer,
    culturalOrganizer,
    riversideOrganizer,
    northvaleCseStudent,
    northvaleEceStudent,
    riversideMediaStudent,
  ] = users;

  const committees = await Committee.create([
    {
      name: "Tech Fest Committee",
      collegeId: northvaleCollege._id,
      departmentIds: [northvaleCse._id],
      memberIds: [techFestOrganizer._id],
      createdBy: northvaleAdmin._id,
      isActive: true,
    },
    {
      name: "Cultural Council",
      collegeId: northvaleCollege._id,
      departmentIds: [northvaleEce._id, northvaleMgmt._id],
      memberIds: [culturalOrganizer._id],
      createdBy: northvaleAdmin._id,
      isActive: true,
    },
    {
      name: "Media Club",
      collegeId: riversideCollege._id,
      departmentIds: [riversideMedia._id],
      memberIds: [riversideOrganizer._id],
      createdBy: riversideAdmin._id,
      isActive: true,
    },
  ]);

  const [techFestCommittee, culturalCommittee, mediaCommittee] = committees;

  techFestOrganizer.committeeIds = [techFestCommittee._id];
  culturalOrganizer.committeeIds = [culturalCommittee._id];
  riversideOrganizer.committeeIds = [mediaCommittee._id];
  await Promise.all([techFestOrganizer.save(), culturalOrganizer.save(), riversideOrganizer.save()]);

  await InviteCode.create([
    {
      code: "NVCSE2026",
      collegeId: northvaleCollege._id,
      departmentId: northvaleCse._id,
      role: ROLE_VALUES.STUDENT,
      expiry: buildDate(120),
      usageLimit: 100,
      usedCount: 0,
      createdBy: northvaleAdmin._id,
      isActive: true,
    },
    {
      code: "NVECEORG",
      collegeId: northvaleCollege._id,
      departmentId: northvaleEce._id,
      role: ROLE_VALUES.ORGANIZER,
      expiry: buildDate(120),
      usageLimit: 10,
      usedCount: 0,
      createdBy: northvaleAdmin._id,
      isActive: true,
    },
    {
      code: "RSMEDIA26",
      collegeId: riversideCollege._id,
      departmentId: riversideMedia._id,
      role: ROLE_VALUES.STUDENT,
      expiry: buildDate(120),
      usageLimit: 75,
      usedCount: 0,
      createdBy: riversideAdmin._id,
      isActive: true,
    },
    {
      code: "TARGETMBA",
      collegeId: northvaleCollege._id,
      departmentId: northvaleMgmt._id,
      role: ROLE_VALUES.STUDENT,
      expiry: buildDate(45),
      usageLimit: 1,
      usedCount: 0,
      email: "mba.invited@student.test",
      createdBy: northvaleAdmin._id,
      isActive: true,
    },
  ]);

  const events = await Event.create([
    {
      title: "Northvale Innovation Hackathon",
      description: "Tentative annual planning event for the CSE department with idea submissions and sprint rounds.",
      location: "Northvale Innovation Lab",
      eventType: "Hackathon",
      banner: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"],
      eventDateTime: [buildDate(30, 9), buildDate(30, 14)],
      seats: { type: "general", value: "250" },
      seatMap: makeGeneralSeatMap(250),
      cost: 0,
      maxTicketsPerStudent: 2,
      certificate: true,
      organizer: techFestOrganizer._id,
      collegeId: northvaleCollege._id,
      departmentIds: [northvaleCse._id],
      committeeId: techFestCommittee._id,
      tentativeDate: buildDate(30, 9),
      isFinalized: false,
      finalDate: null,
      visibilityScope: "department",
      lifecycleState: "tentative",
      status: "upcoming",
      totalRevenue: 0,
      totalBookings: 0,
    },
    {
      title: "Founder Garage Meetup",
      description: "A finalized free college-wide meetup for startup-minded students across Northvale.",
      location: "Auditorium A",
      eventType: "Meetup",
      banner: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
      image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80"],
      eventDateTime: [buildDate(7, 17)],
      seats: { type: "general", value: "180" },
      seatMap: makeGeneralSeatMap(180),
      cost: 0,
      maxTicketsPerStudent: 1,
      certificate: false,
      organizer: techFestOrganizer._id,
      collegeId: northvaleCollege._id,
      departmentIds: [northvaleCse._id, northvaleEce._id, northvaleMgmt._id],
      committeeId: techFestCommittee._id,
      tentativeDate: buildDate(10, 17),
      finalDate: buildDate(7, 17),
      isFinalized: true,
      visibilityScope: "college",
      lifecycleState: "registration_open",
      status: "upcoming",
      totalRevenue: 0,
      totalBookings: 1,
    },
    {
      title: "Cultural Night 2026",
      description: "A paid cultural festival evening with stage performances and check-in scanning for entry.",
      location: "Open Air Theatre",
      eventType: "Live Show",
      banner: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
      image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80"],
      eventDateTime: [buildDate(12, 18)],
      seats: { type: "RowColumns", value: "8x10" },
      seatMap: makeGridSeatMap(8, 10),
      cost: 499,
      maxTicketsPerStudent: 1,
      certificate: false,
      organizer: culturalOrganizer._id,
      collegeId: northvaleCollege._id,
      departmentIds: [northvaleEce._id, northvaleMgmt._id],
      committeeId: culturalCommittee._id,
      tentativeDate: buildDate(16, 18),
      finalDate: buildDate(12, 18),
      isFinalized: true,
      visibilityScope: "college",
      lifecycleState: "registration_open",
      status: "upcoming",
      totalRevenue: 998,
      totalBookings: 2,
    },
    {
      title: "National Media Summit",
      description: "A riverside-hosted global event intended to test cross-college visibility.",
      location: "Riverside Conference Hall",
      eventType: "Webinar",
      banner: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80",
      image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80"],
      eventDateTime: [buildDate(20, 11)],
      seats: { type: "general", value: "500" },
      seatMap: makeGeneralSeatMap(500),
      cost: 149,
      maxTicketsPerStudent: 3,
      certificate: true,
      organizer: riversideOrganizer._id,
      collegeId: riversideCollege._id,
      departmentIds: [riversideMedia._id],
      committeeId: mediaCommittee._id,
      tentativeDate: buildDate(25, 11),
      finalDate: buildDate(20, 11),
      isFinalized: true,
      visibilityScope: "global",
      lifecycleState: "registration_open",
      status: "upcoming",
      totalRevenue: 0,
      totalBookings: 0,
    },
    {
      title: "Robotics Design Sprint",
      description: "A department-scoped tentative event for Northvale CSE students focused on prototype ideas and team formation.",
      location: "Robotics Workshop",
      eventType: "Hackathon",
      banner: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80"],
      eventDateTime: [buildDate(40, 10)],
      seats: { type: "general", value: "120" },
      seatMap: makeGeneralSeatMap(120),
      cost: 0,
      maxTicketsPerStudent: 2,
      certificate: true,
      organizer: techFestOrganizer._id,
      collegeId: northvaleCollege._id,
      departmentIds: [northvaleCse._id],
      committeeId: techFestCommittee._id,
      tentativeDate: buildDate(40, 10),
      finalDate: null,
      isFinalized: false,
      visibilityScope: "department",
      lifecycleState: "tentative",
      status: "upcoming",
      totalRevenue: 0,
      totalBookings: 0,
    },
    {
      title: "Northvale Commerce Conclave",
      description: "A finalized free college event for networking, student showcases, and entrepreneurship panels.",
      location: "Seminar Hall B",
      eventType: "Meetup",
      banner: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"],
      eventDateTime: [buildDate(14, 15)],
      seats: { type: "general", value: "220" },
      seatMap: makeGeneralSeatMap(220),
      cost: 0,
      maxTicketsPerStudent: 2,
      certificate: false,
      organizer: culturalOrganizer._id,
      collegeId: northvaleCollege._id,
      departmentIds: [northvaleCse._id, northvaleEce._id, northvaleMgmt._id],
      committeeId: culturalCommittee._id,
      tentativeDate: buildDate(18, 15),
      finalDate: buildDate(14, 15),
      isFinalized: true,
      visibilityScope: "college",
      lifecycleState: "registration_open",
      status: "upcoming",
      totalRevenue: 0,
      totalBookings: 0,
    },
    {
      title: "Northvale AI Product Bootcamp",
      description: "A finalized paid hands-on bootcamp for Northvale students covering AI prototyping, demos, and product thinking.",
      location: "Innovation Studio 2",
      eventType: "Workshop",
      banner: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
      image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80"],
      eventDateTime: [buildDate(9, 10)],
      seats: { type: "general", value: "140" },
      seatMap: makeGeneralSeatMap(140),
      cost: 199,
      maxTicketsPerStudent: 1,
      certificate: true,
      organizer: techFestOrganizer._id,
      collegeId: northvaleCollege._id,
      departmentIds: [northvaleCse._id, northvaleEce._id],
      committeeId: techFestCommittee._id,
      tentativeDate: buildDate(13, 10),
      finalDate: buildDate(9, 10),
      isFinalized: true,
      visibilityScope: "college",
      lifecycleState: "registration_open",
      status: "upcoming",
      totalRevenue: 0,
      totalBookings: 0,
    },
    {
      title: "Northvale Open Mic Evening",
      description: "A finalized free campus evening for music, spoken word, and student performances across Northvale.",
      location: "Student Activity Courtyard",
      eventType: "Cultural",
      banner: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80",
      image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80"],
      eventDateTime: [buildDate(16, 18)],
      seats: { type: "general", value: "260" },
      seatMap: makeGeneralSeatMap(260),
      cost: 0,
      maxTicketsPerStudent: 2,
      certificate: false,
      organizer: culturalOrganizer._id,
      collegeId: northvaleCollege._id,
      departmentIds: [northvaleCse._id, northvaleEce._id, northvaleMgmt._id],
      committeeId: culturalCommittee._id,
      tentativeDate: buildDate(19, 18),
      finalDate: buildDate(16, 18),
      isFinalized: true,
      visibilityScope: "college",
      lifecycleState: "registration_open",
      status: "upcoming",
      totalRevenue: 0,
      totalBookings: 0,
    },
    {
      title: "Northvale Startup Pitch Arena",
      description: "A finalized paid pitch event with judging, founder feedback, and live audience access for Northvale students.",
      location: "Seminar Hall A",
      eventType: "Competition",
      banner: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80",
      image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80"],
      eventDateTime: [buildDate(21, 14)],
      seats: { type: "RowColumns", value: "6x12" },
      seatMap: makeGridSeatMap(6, 12),
      cost: 349,
      maxTicketsPerStudent: 2,
      certificate: true,
      organizer: techFestOrganizer._id,
      collegeId: northvaleCollege._id,
      departmentIds: [northvaleCse._id, northvaleMgmt._id],
      committeeId: techFestCommittee._id,
      tentativeDate: buildDate(24, 14),
      finalDate: buildDate(21, 14),
      isFinalized: true,
      visibilityScope: "college",
      lifecycleState: "registration_open",
      status: "upcoming",
      totalRevenue: 0,
      totalBookings: 0,
    },
    {
      title: "Intercollege Music Jam",
      description: "A global paid stage event designed to test cross-college discovery and checkout flows.",
      location: "Riverside Amphitheatre",
      eventType: "Live Show",
      banner: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80",
      image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80"],
      eventDateTime: [buildDate(25, 19)],
      seats: { type: "general", value: "350" },
      seatMap: makeGeneralSeatMap(350),
      cost: 299,
      maxTicketsPerStudent: 4,
      certificate: false,
      organizer: riversideOrganizer._id,
      collegeId: riversideCollege._id,
      departmentIds: [riversideMedia._id, riversideCommerce._id],
      committeeId: mediaCommittee._id,
      tentativeDate: buildDate(30, 19),
      finalDate: buildDate(25, 19),
      isFinalized: true,
      visibilityScope: "global",
      lifecycleState: "registration_open",
      status: "upcoming",
      totalRevenue: 0,
      totalBookings: 0,
    },
  ]);

  const [
    tentativeEvent,
    freeCollegeEvent,
    paidCollegeEvent,
    globalEvent,
    roboticsTentativeEvent,
    commerceConclaveEvent,
    aiBootcampEvent,
    openMicEvent,
    pitchArenaEvent,
    musicJamEvent,
  ] = events;

  paidCollegeEvent.seatMap = paidCollegeEvent.seatMap.map((seat) => {
    if (["A1", "A2"].includes(seat.seatLabel)) {
      return { ...seat.toObject?.() || seat, isBooked: true };
    }
    return seat;
  });
  await paidCollegeEvent.save();

  const freeBookingQr = await createTicketQr({
    bookingId: "free-booking-demo",
    eventId: freeCollegeEvent._id.toString(),
    userId: northvaleCseStudent._id.toString(),
  });
  const paidBookingQr1 = await createTicketQr({
    bookingId: "paid-booking-demo-1",
    eventId: paidCollegeEvent._id.toString(),
    userId: northvaleEceStudent._id.toString(),
  });
  const paidBookingQr2 = await createTicketQr({
    bookingId: "paid-booking-demo-2",
    eventId: paidCollegeEvent._id.toString(),
    userId: northvaleCseStudent._id.toString(),
  });

  await Booking.create([
    {
      user_id: northvaleCseStudent._id,
      event_id: freeCollegeEvent._id,
      organizer_id: techFestOrganizer._id,
      booking_dateTime: buildDate(-1, 12),
      seats: "1 General Admission",
      ticket_qr: freeBookingQr,
      event_status: freeCollegeEvent.status,
      collegeId: northvaleCollege._id,
      departmentId: northvaleCse._id,
      committeeId: techFestCommittee._id,
      payment_id: FREE_PAYMENT_ID,
      paymentAmt: 0,
    },
    {
      user_id: northvaleEceStudent._id,
      event_id: paidCollegeEvent._id,
      organizer_id: culturalOrganizer._id,
      booking_dateTime: buildDate(-2, 19),
      seats: "A1",
      ticket_qr: paidBookingQr1,
      event_status: paidCollegeEvent.status,
      collegeId: northvaleCollege._id,
      departmentId: northvaleEce._id,
      committeeId: culturalCommittee._id,
      payment_id: "pay_demo_paid_1",
      paymentAmt: 499,
    },
    {
      user_id: northvaleCseStudent._id,
      event_id: paidCollegeEvent._id,
      organizer_id: culturalOrganizer._id,
      booking_dateTime: buildDate(-2, 19),
      seats: "A2",
      ticket_qr: paidBookingQr2,
      event_status: paidCollegeEvent.status,
      collegeId: northvaleCollege._id,
      departmentId: northvaleCse._id,
      committeeId: culturalCommittee._id,
      payment_id: "pay_demo_paid_2",
      paymentAmt: 499,
    },
  ]);

  await Payment.create([
    {
      razorpay_order_id: "order_demo_paid_1",
      razorpay_payment_id: "pay_demo_paid_1",
      razorpay_signature: "sig_demo_paid_1",
    },
    {
      razorpay_order_id: "order_demo_paid_2",
      razorpay_payment_id: "pay_demo_paid_2",
      razorpay_signature: "sig_demo_paid_2",
    },
  ]);

  northvaleCseStudent.eventsAttended = [freeCollegeEvent._id, paidCollegeEvent._id];
  northvaleEceStudent.eventsAttended = [paidCollegeEvent._id];
  techFestOrganizer.eventsOrganized = [
    tentativeEvent._id,
    freeCollegeEvent._id,
    aiBootcampEvent._id,
    pitchArenaEvent._id,
  ];
  culturalOrganizer.eventsOrganized = [
    paidCollegeEvent._id,
    commerceConclaveEvent._id,
    openMicEvent._id,
  ];
  riversideOrganizer.eventsOrganized = [globalEvent._id];
  await Promise.all([
    northvaleCseStudent.save(),
    northvaleEceStudent.save(),
    techFestOrganizer.save(),
    culturalOrganizer.save(),
    riversideOrganizer.save(),
  ]);

  await Review.create([
    {
      user_id: northvaleCseStudent._id,
      event_id: freeCollegeEvent._id.toString(),
      review: "Great founder stories and a very smooth registration experience.",
      sentiment: "positive",
    },
    {
      user_id: northvaleEceStudent._id,
      event_id: paidCollegeEvent._id.toString(),
      review: "Loved the energy and stage setup. Check-in flow felt quick too.",
      sentiment: "positive",
    },
    {
      user_id: riversideMediaStudent._id,
      event_id: globalEvent._id.toString(),
      review: "Waiting for this one to go live globally. The lineup already looks strong.",
      sentiment: "neutral",
    },
  ]);

  console.log("Database reset complete. Sample data inserted successfully.");
  console.log("");
  console.log("Test accounts (all passwords: password123)");
  console.log("platform_admin  -> platform.admin@bookmyevent.test");
  console.log("college_admin   -> college.admin@northvale.test");
  console.log("college_admin   -> college.admin@riverside.test");
  console.log("organizer       -> organizer.techfest@northvale.test");
  console.log("organizer       -> organizer.cultural@northvale.test");
  console.log("organizer       -> organizer.media@riverside.test");
  console.log("student         -> student.cse@northvale.test");
  console.log("student         -> student.ece@northvale.test");
  console.log("student         -> student.media@riverside.test");
  console.log("pending student -> pending.student@test.com");
  console.log("");
  console.log("Invite codes");
  console.log("NVCSE2026  -> Northvale CSE student invite");
  console.log("NVECEORG   -> Northvale ECE organizer invite");
  console.log("RSMEDIA26  -> Riverside Media student invite");
  console.log("TARGETMBA  -> Email-targeted invite for mba.invited@student.test");
  console.log("");
  console.log("Seeded visible event set");
  console.log("- Upcoming  -> Northvale Innovation Hackathon");
  console.log("- Upcoming  -> Robotics Design Sprint");
  console.log("- Confirmed -> Founder Garage Meetup");
  console.log("- Confirmed -> Cultural Night 2026");
  console.log("- Confirmed -> National Media Summit");
  console.log("- Confirmed -> Northvale Commerce Conclave");
  console.log("- Confirmed -> Northvale AI Product Bootcamp");
  console.log("- Confirmed -> Northvale Open Mic Evening");
  console.log("- Confirmed -> Northvale Startup Pitch Arena");
  console.log("- Confirmed -> Intercollege Music Jam");

  await mongoose.connection.close();
};

seed().catch(async (error) => {
  console.error("Failed to reset and seed demo data:", error);
  await mongoose.connection.close();
  process.exit(1);
});
