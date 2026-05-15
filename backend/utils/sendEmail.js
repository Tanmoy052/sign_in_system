const { Resend } = require("resend");

/**
 * Advanced Email Service for Auth System
 * Uses Resend API for reliable delivery with professional responsive templates.
 */

// Global Configuration
const CONFIG = {
  SENDER: "Auth System <onboarding@resend.dev>",
  BRAND_COLOR: "#4f46e5",
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000,
};

// Validate API key on startup
if (!process.env.RESEND_API_KEY) {
  console.error(
    "❌ CRITICAL: RESEND_API_KEY is missing in environment variables.",
  );
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Creates a professional, responsive HTML template for emails.
 * @param {Object} options - Template options
 * @param {string} options.title - The header title
 * @param {string} options.body - The main message body (HTML)
 * @param {string} [options.preheader] - Short summary text for inbox previews
 * @returns {string} Minified HTML template
 */
const getBaseTemplate = ({ title, body, preheader = "" }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f9fafb; padding-bottom: 40px; padding-top: 40px; }
    .container { max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
    .header { background: linear-gradient(135deg, ${CONFIG.BRAND_COLOR}, #06b6d4); padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; }
    .content { padding: 40px; color: #374151; line-height: 1.6; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; }
    .btn { display: inline-block; padding: 12px 24px; background-color: ${CONFIG.BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
    @media only screen and (max-width: 600px) { .content { padding: 30px 20px; } }
  </style>
</head>
<body>
  <div class="wrapper">
    <!--[if mso]><span style="display:none; font-size:1px; color:#ffffff; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden;">${preheader}</span><![endif]-->
    <div class="container">
      <div class="header">
        <h1>Auth System</h1>
      </div>
      <div class="content">
        <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 700;">${title}</h2>
        ${body}
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Auth System Security Team. All rights reserved.<br>
        This is an automated security notification.
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Core email sender with retry logic and advanced logging.
 * @private
 */
const executeMailSend = async (payload, retryCount = 0) => {
  try {
    const { data, error } = await resend.emails.send(payload);

    if (error) {
      if (retryCount < CONFIG.MAX_RETRIES) {
        console.warn(
          `⚠️ Resend API Error (Attempt ${retryCount + 1}): ${error.message}. Retrying...`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, CONFIG.RETRY_DELAY_MS),
        );
        return executeMailSend(payload, retryCount + 1);
      }
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.warn(
        `⚠️ Network Error (Attempt ${retryCount + 1}): ${err.message}. Retrying...`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.RETRY_DELAY_MS),
      );
      return executeMailSend(payload, retryCount + 1);
    }
    throw err;
  }
};

/**
 * Specialized function to send professional OTP verification emails.
 *
 * @param {string} email - Recipient email address
 * @param {string} otp - The 6-digit verification code
 * @param {string} [subject] - Custom email subject
 * @returns {Promise<Object>} Resend API response data
 * @throws {Error} If validation fails or delivery fails after retries
 */
const sendOTP = async (email, otp, subject = "Verify Your Account") => {
  // Input Validation
  if (!email || !email.includes("@"))
    throw new Error("Invalid recipient email.");
  if (!otp || otp.length < 4) throw new Error("Invalid OTP code.");

  const html = getBaseTemplate({
    title: "Verify Your Identity",
    preheader: `Your verification code is ${otp}`,
    body: `
      <p style="font-size: 16px;">Hello,</p>
      <p style="font-size: 16px;">We received a request to verify your identity. Please use the following One-Time Password (OTP) to complete your action:</p>
      
      <div style="text-align: center; margin: 40px 0; background-color: #f3f4f6; border-radius: 12px; padding: 30px; border: 1px dashed #d1d5db;">
        <span style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #111827; font-family: monospace;">${otp}</span>
      </div>
      
      <p style="font-size: 14px; color: #ef4444; font-weight: 500;">Note: This code is valid for 5 minutes only.</p>
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.</p>
    `,
  });

  console.log(
    `[EmailService] Dispatching OTP to ${email.split("@")[0]}***@***.com`,
  );

  const data = await executeMailSend({
    from: CONFIG.SENDER,
    to: email,
    subject: `${subject} | Auth System`,
    html,
  });

  console.log(
    `✅ [EmailService] Successfully delivered. Tracking ID: ${data.id}`,
  );
  return data;
};

module.exports = sendOTP;
