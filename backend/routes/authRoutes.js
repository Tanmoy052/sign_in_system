// backend/routes/authRoutes.js
const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * PUBLIC ROUTES
 */

// 1. Signup
router.post(
  "/signup",
  [
    body("username")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters."),
    body("email").isEmail().withMessage("Valid email is required."),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters."),
  ],
  authController.signup,
);

// 2. OTP Verification (Signup & Reset)
router.post("/verify-otp", authController.verifyOtp);
router.post("/verify-reset-otp", authController.verifyResetOtp);
router.post("/resend-otp", authController.resendOtp);

// 3. Login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  authController.login,
);

// 4. Password Recovery
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

/**
 * PROTECTED ROUTES
 */
router.get("/dashboard", authMiddleware, authController.getDashboard);

/**
 * DIAGNOSTICS & SYSTEM
 */
router.get("/test", (req, res) => {
  res.json({ status: "success", message: "Auth API is working!" });
});

router.post("/test-email", authController.testEmail);

module.exports = router;
