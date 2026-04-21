import { Router } from "express";
import { getBootstrap, getUserProfile, login, register, logout } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();
router.post("/register" , register);
router.post("/login" , login);
router.get("/getUserProfile" , authenticate ,  getUserProfile);
router.get("/bootstrap" , authenticate , getBootstrap);
router.post('/logout' , logout)
export default router;
