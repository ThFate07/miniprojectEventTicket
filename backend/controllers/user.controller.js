import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Department } from "../models/department.model.js";
import { Committee } from "../models/committee.model.js";
import { normalizeRole, ROLE_VALUES, userHasTenantAssignment } from "../utils/eventAccess.js";

const isProduction = process.env.NODE_ENV === "production";

const authCookieOptions = {
    httpOnly: true,
    sameSite: isProduction ? "None" : "Lax",
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000
};

const buildTokenPayload = (user) => ({
    id: user._id,
    email: user.email,
    role: normalizeRole(user.role),
    collegeId: user.collegeId || null,
    departmentId: user.departmentId || null,
    committeeIds: (user.committeeIds || []).map((committee) => committee?._id || committee),
    inviteStatus: user.inviteStatus || "pending",
});

const serializeUser = (user) => ({
    id: user._id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    collegeEmail: user.collegeEmail || "",
    studentId: user.studentId || "",
    phoneNumber: user.phoneNumber || "",
    role: normalizeRole(user.role),
    collegeId: user.collegeId || null,
    departmentId: user.departmentId || null,
    committeeIds: (user.committeeIds || []).map((committee) => committee?._id || committee),
    inviteStatus: user.inviteStatus || "pending",
    hasTenantAccess: userHasTenantAssignment(user),
});

const register = asyncHandler(async (req, res) => {
    const { email, username, password, fullName, collegeEmail, studentId, phoneNumber } = req.body;

    if (!email || !username || !password || !fullName || !studentId || !phoneNumber) {
        return res.status(400).send({
            message: "Full name, email, username, password, college ID, and phone number are required",
            success: false
        });
    }

    let user = await User.findOne({ email });
    if (user) {
        return res.status(400).send({
            message: "User already exists",
            success: false
        });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    user = new User({
        fullName,
        username,
        email,
        collegeEmail: collegeEmail || "",
        studentId,
        phoneNumber,
        password: hashPassword,
        role: ROLE_VALUES.STUDENT,
        inviteStatus: "pending",
    });

    await user.save();

    const token = jwt.sign(
        buildTokenPayload(user),
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
  
    return res.status(200)
        .cookie("token", token, authCookieOptions)
        .send({
        user: serializeUser(user),
        token,
        message: "Registration successful",
        success: true
    });
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({
            message: "All fields are required",
            success: false
        });
    }

    const user = await User.findOne({ email }).populate("committeeIds", "_id");

    if (!user) {
        return res.status(400).send({
            message: "User does not exist",
            success: false
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(400).send({
            message: "Incorrect email or password",
            success: false
        });
    }

    const token = jwt.sign(
        buildTokenPayload(user),
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    return res.status(200)
        .cookie("token", token, authCookieOptions)
        .send({
            user: serializeUser(user),
            token,
            message: "Login successful",
            success: true
        });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
   .populate("collegeId", "name code")
   .populate("departmentId", "name code collegeId")
   .populate("committeeIds", "name collegeId departmentIds")
   .populate("eventsOrganized", "title banner  status eventDateTime")
    .populate("eventsAttended", "title banner status eventDateTime")


  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    user: {
      ...user.toObject(),
      role: normalizeRole(user.role),
      hasTenantAccess: userHasTenantAssignment(user),
    },
    message: "User profile fetched successfully",
  });
});

const getBootstrap = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
      .populate("collegeId", "name code")
      .populate("departmentId", "name code collegeId")
      .populate("committeeIds", "name collegeId departmentIds");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const departments = user.collegeId
      ? await Department.find({ collegeId: user.collegeId._id, isActive: true }).select("name code collegeId")
      : [];

    const committees =
      normalizeRole(user.role) === ROLE_VALUES.ORGANIZER || normalizeRole(user.role) === ROLE_VALUES.COLLEGE_ADMIN || normalizeRole(user.role) === ROLE_VALUES.PLATFORM_ADMIN
        ? await Committee.find(
            normalizeRole(user.role) === ROLE_VALUES.PLATFORM_ADMIN
              ? { isActive: true }
              : normalizeRole(user.role) === ROLE_VALUES.COLLEGE_ADMIN
                ? { collegeId: user.collegeId?._id, isActive: true }
                : { _id: { $in: user.committeeIds }, isActive: true }
          ).select("name collegeId departmentIds")
        : [];

    return res.status(200).json({
      success: true,
      message: "Bootstrap data fetched successfully",
      user: {
        ...serializeUser(user),
        college: user.collegeId || null,
        department: user.departmentId || null,
      },
      departments,
      committees,
    });
});

const logout = asyncHandler(async (req ,res) => {
    res.clearCookie("token" , authCookieOptions);
    return res.status(200).send({
        message : "Logout Successfull", 
        success : true
    })
})

export { register, login , logout , getUserProfile, getBootstrap };
