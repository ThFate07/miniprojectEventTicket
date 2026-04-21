import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../utils/connectDB.js";
import { loadEnv } from "../utils/loadEnv.js";
import { College } from "../models/college.model.js";
import { Department } from "../models/department.model.js";
import { Committee } from "../models/committee.model.js";
import { InviteCode } from "../models/inviteCode.model.js";
import { User } from "../models/user.model.js";
import { Event } from "../models/events.model.js";
import { ROLE_VALUES } from "../utils/eventAccess.js";

loadEnv();

const buildDate = (daysAhead, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const buildUserProfile = ({ fullName, username, email, studentId, phoneNumber, collegeEmail = "" }) => ({
  fullName,
  username,
  email,
  studentId,
  phoneNumber,
  collegeEmail,
});

const seed = async () => {
  await connectDB();

  const college = await College.findOneAndUpdate(
    { code: "demo-college" },
    { name: "Demo College of Engineering", code: "demo-college", isActive: true },
    { new: true, upsert: true }
  );

  const [cse, ece] = await Promise.all([
    Department.findOneAndUpdate(
      { collegeId: college._id, code: "cse" },
      { name: "Computer Science", code: "cse", collegeId: college._id, isActive: true },
      { new: true, upsert: true }
    ),
    Department.findOneAndUpdate(
      { collegeId: college._id, code: "ece" },
      { name: "Electronics", code: "ece", collegeId: college._id, isActive: true },
      { new: true, upsert: true }
    ),
  ]);

  const hashedPassword = await bcrypt.hash("password123", 10);

  const organizer = await User.findOneAndUpdate(
    { email: "organizer@demo.edu" },
    {
      ...buildUserProfile({
        fullName: "Demo Organizer",
        username: "Demo Organizer",
        email: "organizer@demo.edu",
        studentId: "ORG-DEMO-001",
        phoneNumber: "9876500001",
        collegeEmail: "organizer@demo.edu",
      }),
      password: hashedPassword,
      role: ROLE_VALUES.ORGANIZER,
      collegeId: college._id,
      departmentId: cse._id,
      inviteStatus: "accepted",
    },
    { upsert: true, new: true }
  );

  const student = await User.findOneAndUpdate(
    { email: "student@demo.edu" },
    {
      ...buildUserProfile({
        fullName: "Demo Student",
        username: "Demo Student",
        email: "student@demo.edu",
        studentId: "STU-DEMO-001",
        phoneNumber: "9876500002",
        collegeEmail: "student@demo.edu",
      }),
      password: hashedPassword,
      role: ROLE_VALUES.STUDENT,
      collegeId: college._id,
      departmentId: cse._id,
      inviteStatus: "accepted",
    },
    { upsert: true, new: true }
  );

  const collegeAdmin = await User.findOneAndUpdate(
    { email: "admin@demo.edu" },
    {
      ...buildUserProfile({
        fullName: "Demo College Admin",
        username: "Demo College Admin",
        email: "admin@demo.edu",
        studentId: "ADM-DEMO-001",
        phoneNumber: "9876500003",
        collegeEmail: "admin@demo.edu",
      }),
      password: hashedPassword,
      role: ROLE_VALUES.COLLEGE_ADMIN,
      collegeId: college._id,
      departmentId: cse._id,
      inviteStatus: "accepted",
    },
    { upsert: true, new: true }
  );

  const committee = await Committee.findOneAndUpdate(
    { name: "Tech Fest Committee", collegeId: college._id },
    {
      name: "Tech Fest Committee",
      collegeId: college._id,
      departmentIds: [cse._id],
      memberIds: [organizer._id],
      createdBy: collegeAdmin._id,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  organizer.committeeIds = [committee._id];
  await organizer.save();

  await InviteCode.findOneAndUpdate(
    { code: "DEMOJOIN" },
    {
      code: "DEMOJOIN",
      collegeId: college._id,
      departmentId: cse._id,
      role: ROLE_VALUES.STUDENT,
      expiry: buildDate(90),
      usageLimit: 50,
      usedCount: 0,
      createdBy: collegeAdmin._id,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  await Event.findOneAndUpdate(
    { title: "Annual Innovation Hackathon", committeeId: committee._id },
    {
      title: "Annual Innovation Hackathon",
      description: "A college-wide hackathon planned at the beginning of the academic year.",
      location: "Main Auditorium",
      eventType: "Hackathon",
      banner: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"],
      eventDateTime: [buildDate(30, 9), buildDate(30, 14)],
      seats: { type: "general", value: "300" },
      seatMap: Array.from({ length: 300 }, (_, index) => ({ seatLabel: `GA${index + 1}`, isBooked: false })),
      cost: 0,
      maxTicketsPerStudent: 2,
      organizer: organizer._id,
      collegeId: college._id,
      departmentIds: [cse._id],
      committeeId: committee._id,
      tentativeDate: buildDate(30, 9),
      finalDate: null,
      isFinalized: false,
      visibilityScope: "college",
      lifecycleState: "tentative",
      status: "upcoming",
    },
    { upsert: true, new: true }
  );

  console.log("Demo college data seeded successfully.");
  await mongoose.connection.close();
};

seed().catch(async (error) => {
  console.error("Failed to seed demo data:", error);
  await mongoose.connection.close();
  process.exit(1);
});
