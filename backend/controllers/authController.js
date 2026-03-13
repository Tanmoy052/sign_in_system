// backend/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const sendOTP = require("../utils/sendEmail");

// 6-digit numeric OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Login JWT (1 hour)
const generateAuthToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

// Reset-password JWT (10 minutes)
const generateResetToken = (userId) => {
  return jwt.sign(
    { id: userId, purpose: "password-reset" },
    process.env.RESET_TOKEN_SECRET,
    { expiresIn: "10m" },
  );
};

// ========== SIGN UP ==========
exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;
  console.log(`[Signup Request] Username: ${username}, Email: ${email}`);

  try {
    console.log("Checking if user exists...");
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user && user.isVerified) {
      console.log("User already exists and is verified.");
      return res
        .status(400)
        .json({ message: "An account with this email already exists." });
    }

    console.log("Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    if (!user) {
      console.log("Creating new user instance...");
      user = new User({
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        isVerified: false,
        otp,
        otpExpiry,
      });
    } else {
      console.log("Updating existing unverified user...");
      user.username = username;
      user.password = hashedPassword;
      user.otp = otp;
      user.otpExpiry = otpExpiry;
    }

    console.log("Saving user to database...");
    await user.save();
    console.log("User saved successfully.");

    // --- Send OTP Email (Asynchronously in background for speed) ---
    console.log(`Attempting to send OTP email to ${user.email}...`);
    sendOTP(user.email, "Account Verification OTP", otp).catch((emailError) => {
      console.error(
        "CRITICAL: Failed to send OTP email in background.",
        emailError,
      );
    });

    return res.status(201).json({
      message: "Signup successful. OTP sent to your email.",
      email: user.email,
    });
  } catch (err) {
    console.error("Signup error details:", err);
    res.status(500).json({
      message: "Server error during signup.",
      error: err.message,
      stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
  }
};

// ========== VERIFY EMAIL OTP ==========
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "User not found." });

    if (!user.otp || !user.otpExpiry) {
      return res
        .status(400)
        .json({ message: "No OTP found. Please sign up again." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.status(200).json({ message: "Email verified successfully." });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "Server error during OTP verification." });
  }
};

// ========== LOGIN ==========
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    if (!user.isVerified) {
      return res
        .status(400)
        .json({ message: "Please verify your email first." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = generateAuthToken(user);

    res.status(200).json({
      message: "Login successful.",
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
};

// ========== FORGOT PASSWORD ==========
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendOTP(user.email, "Password Reset OTP", otp);

    res.status(200).json({
      message: "Password reset OTP sent to your email.",
      email: user.email,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error during forgot password." });
  }
};

// ========== VERIFY RESET OTP ==========
exports.verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "User not found." });

    if (!user.otp || !user.otpExpiry) {
      return res
        .status(400)
        .json({ message: "No OTP found. Please request again." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    const resetToken = generateResetToken(user._id);

    res.status(200).json({
      message: "OTP verified. You can now reset your password.",
      resetToken,
    });
  } catch (err) {
    console.error("Verify reset OTP error:", err);
    res
      .status(500)
      .json({ message: "Server error during reset OTP verification." });
  }
};

// ========== RESET PASSWORD ==========
exports.resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res
      .status(400)
      .json({ message: "Reset token and new password are required." });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.RESET_TOKEN_SECRET);
    } catch {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token." });
    }

    if (decoded.purpose !== "password-reset") {
      return res.status(400).json({ message: "Invalid reset token purpose." });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).json({ message: "User not found." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error during password reset." });
  }
};

// ========== DASHBOARD (PROTECTED) ==========
exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -otp -otpExpiry",
    );
    if (!user) return res.status(404).json({ message: "User not found." });

    res.status(200).json({
      message: `Welcome to your dashboard, ${user.username}!`,
      user,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Server error while loading dashboard." });
  }
};

// ========== TEST EMAIL (DIAGNOSTICS) ==========
exports.testEmail = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ message: "Email is required to test." });

  console.log(`[Diagnostic] Attempting to send a TEST email to: ${email}`);
  try {
    await sendOTP(email, "TEST EMAIL - Auth System", "123456");
    res.status(200).json({
      message:
        "Test email sent successfully! Please check your Gmail (and Spam folder).",
      config_used: {
        user: process.env.EMAIL_USER ? "Present (Correct)" : "MISSING",
        pass: process.env.EMAIL_PASS ? "Present (Correct)" : "MISSING",
      },
    });
  } catch (err) {
    console.error("[Diagnostic] Test email FAILED:", err);
    res.status(500).json({
      message: "Test email failed. Check Render logs for error details.",
      error: err.message,
    });
  }
};
