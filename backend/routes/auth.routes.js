import express from "express";
const router = express.Router();
import { login, callback, logout } from "../controllers/auth.controller.js";

router.get("/login", login);
router.get("/callback", callback);
router.get("/logout", logout);

router.get("/profile", (req, res) => {
  if (req.oidc.user) {
    res.json({
      email: req.oidc.user.email,
      name: req.oidc.user.name,
      sub: req.oidc.user.sub
    });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});



export default router;
