import crypto from "node:crypto";
import { InviteCode } from "../models/inviteCode.model.js";
import { Department } from "../models/department.model.js";
import { College } from "../models/college.model.js";
import { Committee } from "../models/committee.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { canManageCollege, normalizeRole, ROLE_VALUES } from "../utils/eventAccess.js";
import { mail } from "../utils/email.js";
import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === "production";

const authCookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "None" : "Lax",
  secure: isProduction,
  maxAge: 24 * 60 * 60 * 1000,
};

const buildTokenPayload = (user) => ({
  id: user._id,
  email: user.email,
  role: normalizeRole(user.role),
  collegeId: user.collegeId || null,
  departmentId: user.departmentId || null,
  committeeIds: user.committeeIds || [],
  inviteStatus: user.inviteStatus || "pending",
});

const sanitizeInvite = (invite) => ({
  id: invite._id,
  code: invite.code,
  collegeId: invite.collegeId,
  departmentId: invite.departmentId,
  role: invite.role,
  expiry: invite.expiry,
  usageLimit: invite.usageLimit,
  usedCount: invite.usedCount,
  email: invite.email,
  isActive: invite.isActive,
});

const loadScopedDepartment = async ({ departmentId, collegeId }) => {
  const department = await Department.findById(departmentId);

  if (!department) {
    return null;
  }

  if (collegeId && department.collegeId.toString() !== collegeId.toString()) {
    return null;
  }

  return department;
};

const createInviteCode = asyncHandler(async (req, res) => {
  const {
    collegeId,
    departmentId,
    role = ROLE_VALUES.STUDENT,
    expiry,
    usageLimit = 1,
    email = null,
  } = req.body;

  if (!collegeId || !departmentId || !expiry) {
    return res.status(400).json({
      success: false,
      message: "collegeId, departmentId, and expiry are required",
    });
  }

  if (!canManageCollege(req.user, collegeId)) {
    return res.status(403).json({
      success: false,
      message: "You cannot create invites for this college",
    });
  }

  const [college, department] = await Promise.all([
    College.findById(collegeId),
    loadScopedDepartment({ departmentId, collegeId }),
  ]);

  if (!college || !department) {
    return res.status(404).json({
      success: false,
      message: "College or department not found",
    });
  }

  const code = crypto.randomBytes(4).toString("hex").toUpperCase();
  const invite = await InviteCode.create({
    code,
    collegeId,
    departmentId,
    role: normalizeRole(role),
    expiry,
    usageLimit,
    email: email?.trim().toLowerCase() || null,
    createdBy: req.user.id,
  });

  return res.status(201).json({
    success: true,
    message: "Invite code created successfully",
    invite: sanitizeInvite(invite),
  });
});

const validateInviteCode = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: "Invite code is required",
    });
  }

  const invite = await InviteCode.findOne({ code: code.trim().toUpperCase(), isActive: true })
    .populate("collegeId", "name code")
    .populate("departmentId", "name code");

  if (!invite) {
    return res.status(404).json({
      success: false,
      message: "Invite code not found",
    });
  }

  if (invite.isExpired()) {
    return res.status(400).json({
      success: false,
      message: "Invite code has expired",
    });
  }

  if (!invite.hasRemainingUses()) {
    return res.status(400).json({
      success: false,
      message: "Invite code usage limit has been reached",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Invite code is valid",
    invite: {
      ...sanitizeInvite(invite),
      college: invite.collegeId,
      department: invite.departmentId,
    },
  });
});

const acceptInviteCode = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: "Invite code is required",
    });
  }

  const [invite, user] = await Promise.all([
    InviteCode.findOne({ code: code.trim().toUpperCase(), isActive: true }),
    User.findById(req.user.id),
  ]);

  if (!invite || !user) {
    return res.status(404).json({
      success: false,
      message: "Invite or user not found",
    });
  }

  if (invite.isExpired()) {
    return res.status(400).json({
      success: false,
      message: "Invite code has expired",
    });
  }

  if (!invite.hasRemainingUses()) {
    return res.status(400).json({
      success: false,
      message: "Invite code usage limit has been reached",
    });
  }

  if (invite.email && invite.email !== user.email?.toLowerCase()) {
    return res.status(403).json({
      success: false,
      message: "This invite was issued for a different email address",
    });
  }

  user.collegeId = invite.collegeId;
  user.departmentId = invite.departmentId;
  user.role = normalizeRole(invite.role || user.role);
  user.inviteStatus = "accepted";
  await user.save();

  if (user.role === ROLE_VALUES.ORGANIZER) {
    const committees = await Committee.find({
      collegeId: invite.collegeId,
      isActive: true,
      $or: [{ departmentIds: invite.departmentId }, { departmentIds: { $size: 0 } }],
    }).select("_id");

    if (committees.length > 0) {
      const committeeIds = committees.map((committee) => committee._id);
      user.committeeIds = Array.from(
        new Set([...(user.committeeIds || []).map((committeeId) => committeeId.toString()), ...committeeIds.map((committeeId) => committeeId.toString())])
      );
      await user.save();

      await Committee.updateMany(
        { _id: { $in: committeeIds } },
        { $addToSet: { memberIds: user._id } }
      );
    }
  }

  invite.usedCount += 1;
  if (!invite.hasRemainingUses()) {
    invite.isActive = false;
  }
  await invite.save();

  const token = jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  return res
    .status(200)
    .cookie("token", token, authCookieOptions)
    .json({
      success: true,
      message: "Invite accepted successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        collegeId: user.collegeId,
        departmentId: user.departmentId,
        committeeIds: user.committeeIds,
        inviteStatus: user.inviteStatus,
        hasTenantAccess: true,
      },
    });
});

const inviteByEmail = asyncHandler(async (req, res) => {
  const { collegeId, departmentId, role = ROLE_VALUES.STUDENT, expiry, email } = req.body;

  if (!collegeId || !departmentId || !expiry || !email) {
    return res.status(400).json({
      success: false,
      message: "collegeId, departmentId, expiry, and email are required",
    });
  }

  if (!canManageCollege(req.user, collegeId)) {
    return res.status(403).json({
      success: false,
      message: "You cannot invite users to this college",
    });
  }

  const department = await loadScopedDepartment({ departmentId, collegeId });
  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  const code = crypto.randomBytes(4).toString("hex").toUpperCase();
  const invite = await InviteCode.create({
    code,
    collegeId,
    departmentId,
    role: normalizeRole(role),
    expiry,
    usageLimit: 1,
    email: email.trim().toLowerCase(),
    createdBy: req.user.id,
  });

  await mail({
    to: invite.email,
    subject: "You're invited to join your college on Book My Event",
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2>College platform invitation</h2>
        <p>Use the invite code below after signing in to join your college workspace.</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${invite.code}</p>
        <p>This invite expires on ${new Date(invite.expiry).toLocaleString()}.</p>
      </div>
    `,
  });

  return res.status(201).json({
    success: true,
    message: "Invitation email sent successfully",
    invite: sanitizeInvite(invite),
  });
});

export { createInviteCode, validateInviteCode, acceptInviteCode, inviteByEmail };
