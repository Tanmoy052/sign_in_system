// backend/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const sendOTP = require("../utils/sendEmail");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// Helper: Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper: Sign JWT Token
const signToken = (id, email, secret, expires) => {
  return jwt.sign({ id, email }, secret, { expiresIn: expires });
};

// ========== SIGN UP ==========
exports.signup = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors
      .array()
      .map((err) => err.msg)
      .join(" ");
    return next(new AppError(errorMsg, 400));
  }

  const { username, email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  // 1. Check if user already exists
  let user = await User.findOne({ email: normalizedEmail });

  if (user && user.isVerified) {
    return next(
      new AppError("An account with this email already exists.", 400),
    );
  }

  // 2. Prepare user data
  const hashedPassword = await bcrypt.hash(password, 12);
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Increased to 10 minutes

  if (!user) {
    user = await User.create({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      isVerified: false,
      otp,
      otpExpiry,
    });
  } else {
    // Update existing unverified user
    user.username = username;
    user.password = hashedPassword;
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    user.otpAttempts = 0;
    await user.save();
  }

  // 3. Send OTP (Background task)
  sendOTP(user.email, otp, "Account Verification OTP").catch((err) => {
    console.error(
      `[Email Error] Failed to send signup OTP to ${user.email}:`,
      err.message,
    );
  });

  res.status(201).json({
    status: "success",
    message: "Signup initiated. Please verify your email with the OTP sent.",
    data: { email: user.email },
  });
});

// ========== VERIFY EMAIL OTP ==========
exports.verifyOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError("Email and OTP are required.", 400));
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return next(new AppError("User not found.", 404));

  if (!user.otp || !user.otpExpiry) {
    return next(
      new AppError("No active OTP found. Please request a new one.", 400),
    );
  }

  // Brute force protection for OTP
  if (user.otpAttempts >= 5) {
    return next(
      new AppError("Too many failed attempts. Please request a new OTP.", 429),
    );
  }

  // Check Expiry
  if (user.otpExpiry < new Date()) {
    return next(
      new AppError("OTP has expired. Please request a new one.", 400),
    );
  }

  // Validate OTP
  if (user.otp !== otp) {
    user.otpAttempts += 1;
    await user.save();
    return next(
      new AppError(
        `Invalid OTP. ${5 - user.otpAttempts} attempts remaining.`,
        400,
      ),
    );
  }

  // Success: Verify User
  user.isVerified = true;
  user.otp = null;
  user.otpExpiry = null;
  user.otpAttempts = 0;
  await user.save();

  const token = signToken(user._id, user.email, process.env.JWT_SECRET, "1h");

  res.status(200).json({
    status: "success",
    message: "Email verified successfully.",
    token,
  });
});

// ========== LOGIN ==========
exports.login = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError("Invalid input data", 400));
  }

  const { email, password } = req.body;

  // 1. Check if user exists and include password
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password",
  );

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError("Incorrect email or password.", 401));
  }

  // 2. Check if verified
  if (!user.isVerified) {
    return next(
      new AppError("Please verify your email before logging in.", 403),
    );
  }

  // 3. Generate Token
  const token = signToken(user._id, user.email, process.env.JWT_SECRET, "1h");

  res.status(200).json({
    status: "success",
    message: "Login successful.",
    token,
  });
});

// ========== FORGOT PASSWORD ==========
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError("Email is required.", 400));

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // For security, don't reveal if user exists or not
    return res.status(200).json({
      status: "success",
      message:
        "If an account with that email exists, we have sent a reset OTP.",
    });
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  user.otpAttempts = 0;
  await user.save();

  sendOTP(user.email, otp, "Password Reset OTP").catch((err) => {
    console.error(
      `[Email Error] Failed to send reset OTP to ${user.email}:`,
      err.message,
    );
  });

  res.status(200).json({
    status: "success",
    message: "Password reset OTP sent to your email.",
    data: { email: user.email },
  });
});

// ========== VERIFY RESET OTP ==========
exports.verifyResetOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return next(new AppError("Email and OTP are required.", 400));
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return next(new AppError("User not found.", 404));

  if (!user.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
    return next(new AppError("OTP is invalid or has expired.", 400));
  }

  if (user.otp !== otp) {
    user.otpAttempts += 1;
    await user.save();
    return next(new AppError("Invalid OTP.", 400));
  }

  // Generate short-lived reset token
  const resetToken = signToken(
    user._id,
    user.email,
    process.env.RESET_TOKEN_SECRET,
    "10m",
  );

  // Clear OTP
  user.otp = null;
  user.otpExpiry = null;
  user.otpAttempts = 0;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "OTP verified. Proceed to reset password.",
    resetToken,
  });
});

// ========== RESET PASSWORD ==========
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return next(new AppError("Token and new password are required.", 400));
  }

  // 1. Verify Token
  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.RESET_TOKEN_SECRET);
  } catch (err) {
    return next(new AppError("Invalid or expired reset token.", 401));
  }

  // 2. Find User and Update
  const user = await User.findById(decoded.id);
  if (!user) return next(new AppError("User no longer exists.", 404));

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  user.password = hashedPassword;
  user.otp = null;
  user.otpExpiry = null;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password has been reset successfully. Please log in.",
  });
});

// ========== DASHBOARD (PROTECTED) ==========
exports.getDashboard = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) return next(new AppError("User not found.", 404));

  res.status(200).json({
    status: "success",
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
      },
    },
  });
});

// ========== RESEND OTP ==========
exports.resendOtp = catchAsync(async (req, res, next) => {
  const { email, type } = req.body;
  if (!email) return next(new AppError("Email is required.", 400));

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return next(new AppError("User not found.", 404));

  if (type === "signup" && user.isVerified) {
    return next(new AppError("Email is already verified.", 400));
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  user.otpAttempts = 0;
  await user.save();

  const subject =
    type === "reset" ? "Password Reset OTP" : "Account Verification OTP";

  sendOTP(user.email, otp, subject).catch((err) => {
    console.error(
      `[Email Error] Failed to resend OTP to ${user.email}:`,
      err.message,
    );
  });

  res.status(200).json({
    status: "success",
    message: `A new OTP has been sent to ${user.email}.`,
  });
});

// ========== DIAGNOSTICS ==========
exports.testEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError("Email is required for testing.", 400));

  await sendOTP(email, "123456", "Diagnostic Test Email");

  res.status(200).json({
    status: "success",
    message: "Test email dispatched successfully.",
    config: {
      resend_key: process.env.RESEND_API_KEY ? "CONFIGURED" : "MISSING",
    },
  });
});
