// backend/utils/sendEmail.js
const sgMail = require("@sendgrid/mail");

// Set the API key from environment variables (Render/Vercel)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendOTP = async (email, subject, otp) => {
  const msg = {
    to: email,
    from: "login System <noreply.support.login@gmail.com>", // Your verified sender in SendGrid
    subject: subject || "Your OTP Code",
    text: `Your OTP is: ${otp}. It will expire in 5 minutes.`,
    html: `<strong>Your OTP is: ${otp}</strong><p>It will expire in 5 minutes.</p>`,
  };

  try {
    await sgMail.send(msg);
    console.log(`[Email Service] OTP sent to ${email}`);
  } catch (error) {
    console.error(`[Email Service] Error sending email to ${email}:`, error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw error;
  }
};

module.exports = sendOTP;
