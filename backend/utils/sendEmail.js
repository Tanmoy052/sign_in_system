// backend/utils/sendEmail.js
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTP = async (email, subject, otp) => {
  console.log(`[Email Service] Attempting to send OTP via Resend to: ${email}`);
  const text = `Your verification code is ${otp}. This code will expire in 5 minutes.`;

  try {
    const { data, error } = await resend.emails.send({
      from: "Auth System <noreply.support.login@gmail.com>",
      to: email,
      subject: subject,
      text: text,
    });

    if (error) {
      throw error;
    }

    console.log(`[Email Service] Success: OTP sent via Resend. ID: ${data.id}`);
    return data;
  } catch (err) {
    console.error(
      `[Email Service] Error sending email via Resend to ${email}:`,
      err,
    );
    throw err;
  }
};

module.exports = sendOTP;
