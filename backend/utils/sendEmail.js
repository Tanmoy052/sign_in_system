// backend/utils/sendEmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTP = async (email, subject, otp) => {
  const text = `Your verification code is ${otp}. This code will expire in 5 minutes.`;

  await transporter.sendMail({
    from: `"Auth System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    text
  });
};

module.exports = sendOTP;
