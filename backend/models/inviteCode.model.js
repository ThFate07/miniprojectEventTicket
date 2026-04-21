import mongoose from "mongoose";
import { ROLE_VALUES } from "../utils/eventAccess.js";

const inviteCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLE_VALUES),
      default: ROLE_VALUES.STUDENT,
    },
    expiry: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

inviteCodeSchema.methods.isExpired = function isExpired() {
  return new Date() > this.expiry;
};

inviteCodeSchema.methods.hasRemainingUses = function hasRemainingUses() {
  return this.usedCount < this.usageLimit;
};

export const InviteCode = mongoose.model("InviteCode", inviteCodeSchema);
