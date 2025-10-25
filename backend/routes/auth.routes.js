import express from "express";
const router = express.Router();
import { login, callback, logout } from "../controllers/auth.controller.js";

router.get("/login", login);
router.get("/callback", callback);
router.get("/logout", logout);





export default router;
