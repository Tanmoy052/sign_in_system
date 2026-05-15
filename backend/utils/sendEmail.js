const { Resend } = require("resend");

// Validate API key on startup
if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is missing in environment variables");
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - Verification code
 * @param {string} subject - Optional email subject
 */
const sendOTP = async (email, otp, subject = "Your Verification Code") => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Auth System <onboarding@resend.dev>",
      to: email,
      subject,
      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        ">
          <h2 style="text-align:center;">
            Auth System Verification
          </h2>

          <p>Hello,</p>

          <p>Your OTP code is:</p>

          <div style="
            text-align:center;
            margin: 25px 0;
          ">
            <h1 style="
              letter-spacing: 8px;
              padding: 15px 25px;
              display:inline-block;
              background:#f3f4f6;
              border-radius:8px;
            ">
              ${otp}
            </h1>
          </div>

          <p>
            This code will expire in 5 minutes.
          </p>

          <hr>

          <p style="
            font-size:12px;
            color:#6b7280;
            text-align:center;
          ">
            Auth System Security Team
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error:", error);
      throw new Error(error.message);
    }

    console.log("OTP email sent successfully:", data.id);

    return data;
  } catch (error) {
    console.error("Failed to send OTP email:", error.message);
    throw error;
  }
};

module.exports = sendOTP;
