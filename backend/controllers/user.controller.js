import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === "production";

const authCookieOptions = {
    httpOnly: true,
    sameSite: isProduction ? "None" : "Lax",
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000
};

const register = asyncHandler(async (req, res) => {
    const { email, username, password, role } = req.body;

    if (!email || !username || !password || !role) {
        return res.status(400).send({
            message: "All fields are required",
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
        username,
        email,
        password: hashPassword,
        role
    });

    await user.save();

    const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
  
    return res.status(200)
        .cookie("token", token, authCookieOptions)
        .send({
        user: {
            id: user._id,
            email: user.email,
            username: user.username,
            role: user.role
        },
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

    const user = await User.findOne({ email });

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
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    return res.status(200)
        .cookie("token", token, authCookieOptions)
        .send({
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role
            },
            token,
            message: "Login successful",
            success: true
        });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
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
    user,
    message: "User profile fetched successfully",
  });
});

const logout = asyncHandler(async (req ,res) => {
    res.clearCookie("token" , authCookieOptions);
    return res.status(200).send({
        message : "Logout Successfull", 
        success : true
    })
})

export { register, login , logout , getUserProfile };
