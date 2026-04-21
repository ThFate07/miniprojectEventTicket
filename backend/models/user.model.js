import mongoose from "mongoose";
import { ROLE_VALUES } from "../utils/eventAccess.js";

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, "Full name is required"],
    trim: true,
  },
  username: {
    type: String,
    required: [true, "Username is required"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
  },
  collegeEmail: {
    type: String,
    default: "",
    trim: true,
  },
  studentId: {
    type: String,
    default: "",
    trim: true,
  },
  phoneNumber: {
    type: String,
    default: "",
    trim: true,
  },
  eventsOrganized: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
  ],
  eventsAttended: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
  ],
  role: {
    type: String,
    enum: Object.values(ROLE_VALUES),
    default: ROLE_VALUES.STUDENT,
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    default: null,
    index: true,
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    default: null,
    index: true,
  },
  committeeIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Committee",
    },
  ],
  inviteStatus: {
    type: String,
    enum: ["pending", "accepted"],
    default: "pending",
  },
});
export const User = mongoose.model("User", userSchema);
