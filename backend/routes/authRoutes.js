// backend/routes/authRoutes.js
const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/auth/signup
router.post(
  "/signup",
  [
    body("username").trim().notEmpty().withMessage("Username is required."),
    body("email").isEmail().withMessage("Valid email is required."),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters.")
  ],
  authController.signup
);

// POST /api/auth/verify-otp
router.post("/verify-otp", authController.verifyOtp);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").notEmpty().withMessage("Password is required.")
  ],
  authController.login
);

// POST /api/auth/forgot-password
router.post("/forgot-password", authController.forgotPassword);

// POST /api/auth/verify-reset-otp
router.post("/verify-reset-otp", authController.verifyResetOtp);

// POST /api/auth/reset-password
router.post("/reset-password", authController.resetPassword);

// GET /api/auth/dashboard (protected)
router.get("/dashboard", authMiddleware, authController.getDashboard);

// ✅ Test route
router.get("/test", (req, res) => {
  res.json({ message: "Auth API is working!" });
});

module.exports = router;

