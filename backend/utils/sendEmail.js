const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an OTP email using Resend.
 * @param {string} email - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} otp - The 6-digit code
 */
const sendOTP = async (email, subject, otp) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("CRITICAL: RESEND_API_KEY is missing from environment variables.");
      throw new Error("Email configuration missing");
    }

    const { data, error } = await resend.emails.send({
      from: "Auth System <onboarding@resend.dev>",
      to: email,
      subject: subject || "Your Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #4f46e5; text-align: center;">Login System Verification</h2>
          <p style="font-size: 16px; color: #374151;">Hello,</p>
          <p style="font-size: 16px; color: #374151;">Your verification code is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <h1 style="font-size: 48px; letter-spacing: 8px; color: #111827; background: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block;">${otp}</h1>
          </div>
          <p style="font-size: 14px; color: #6b7280; text-align: center;">This code will expire in 5 minutes.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">Login System Security Team</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error:", error);
      throw error;
    }

    console.log("Email sent successfully via Resend:", data.id);
    return data;
  } catch (err) {
    console.error("Failed to send email via Resend:", err.message);
    throw err;
  }
};

module.exports = sendOTP;
