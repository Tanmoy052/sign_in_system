const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an OTP email using Resend.
 * @param {string} email - Recipient email address
 * @param {string} subject - Email subject (optional, defaults to "Your OTP Code")
 * @param {string} otp - The 6-digit code
 */
async function sendOTP(email, subject, otp) {
  // If only two arguments are passed, the second one might be the OTP
  if (
    otp === undefined &&
    typeof subject === "string" &&
    subject.length === 6 &&
    !isNaN(subject)
  ) {
    otp = subject;
    subject = "Your OTP Code";
  }

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: subject || "Your OTP Code",
    html: `<h2>Your OTP: ${otp}</h2>`,
  });
}

module.exports = sendOTP;
