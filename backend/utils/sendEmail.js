// backend/utils/sendEmail.js
const sgMail = require("@sendgrid/mail");

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn(
    "[Email Service] Warning: SENDGRID_API_KEY is not set in environment variables.",
  );
}

const sendOTP = async (email, subject, otp) => {
  console.log(
    `[Email Service] Attempting to send OTP via SendGrid to: ${email}`,
  );

  const msg = {
    to: email,
    from: "login System <noreply.support.login@gmail.com>", // Verified sender in SendGrid
    subject: subject,
    text: `Your verification code is ${otp}. This code will expire in 5 minutes.`,
    html: `<strong>Your verification code is ${otp}</strong>. This code will expire in 5 minutes.`,
  };

  try {
    const response = await sgMail.send(msg);
    console.log(
      `[Email Service] Success: OTP sent via SendGrid API. Status Code: ${response[0].statusCode}`,
    );
    return response;
  } catch (error) {
    console.error(
      `[Email Service] Error sending email via SendGrid API to ${email}:`,
      error,
    );
    if (error.response) {
      console.error(error.response.body);
    }
    throw error;
  }
};

module.exports = sendOTP;
