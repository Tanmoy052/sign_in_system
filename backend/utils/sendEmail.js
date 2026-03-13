// backend/utils/sendEmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTP = async (email, subject, otp) => {
  console.log(`[Email Service] Attempting to send OTP to: ${email}`);
  const text = `Your verification code is ${otp}. This code will expire in 5 minutes.`;

  try {
    const info = await transporter.sendMail({
      from: `"Auth System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      text
    });
    console.log(`[Email Service] Success: OTP sent to ${email}. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Email Service] Error sending email to ${email}:`, error);
    throw error;
  }
};

module.exports = sendOTP;
