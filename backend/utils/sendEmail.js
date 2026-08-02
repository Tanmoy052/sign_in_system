const SibApiV3Sdk = require("sib-api-v3-sdk");

/**
 * Advanced Email Service for Auth System
 * Uses Brevo (formerly Sendinblue) API for reliable delivery with professional responsive templates.
 */

// Global Configuration
const CONFIG = {
  SENDER_EMAIL: "noreply.support.login@gmail.com",
  SENDER_NAME: "Auth System",
  BRAND_COLOR: "#4f46e5",
  MAX_RETRIES: 3, // Increased to 3 for better production reliability
  RETRY_DELAY_MS: 1500, // Slightly longer delay
  TIMEOUT_MS: 10000, // 10s timeout for API calls
};

// Validate API key on startup
if (!process.env.BREVO_API_KEY) {
  console.error(
    "❌ CRITICAL: BREVO_API_KEY is missing. Email service will fail.",
  );
  // Don't exit process here to allow the server to still serve health checks,
  // but the email service itself will throw errors on use.
}

// Initialize Brevo Client
let apiInstance = null;
if (process.env.BREVO_API_KEY) {
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications["api-key"];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
}

/**
 * Creates a professional, responsive HTML template for emails.
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
    .container { max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb; }
    .header { background: linear-gradient(135deg, ${CONFIG.BRAND_COLOR}, #06b6d4); padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; }
    .content { padding: 40px; color: #374151; line-height: 1.6; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; }
    @media only screen and (max-width: 600px) { .content { padding: 30px 20px; } }
  </style>
</head>
<body>
  <div class="wrapper">
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
 * Core email sender with retry logic and timeout protection.
 */
const executeMailSend = async (sendSmtpEmail, retryCount = 0) => {
  if (!apiInstance) {
    throw new Error("Brevo API instance not initialized. Check BREVO_API_KEY.");
  }

  try {
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Email API request timed out")),
        CONFIG.TIMEOUT_MS,
      ),
    );

    return await Promise.race([
      apiInstance.sendTransacEmail(sendSmtpEmail),
      timeoutPromise,
    ]);
  } catch (err) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.warn(
        `⚠️ Brevo API Error (Attempt ${retryCount + 1}): ${err.message}. Retrying in ${CONFIG.RETRY_DELAY_MS}ms...`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.RETRY_DELAY_MS),
      );
      return executeMailSend(sendSmtpEmail, retryCount + 1);
    }
    throw err;
  }
};

/**
 * Specialized function to send professional OTP verification emails via Brevo.
 */
const sendOTP = async (email, otp, subject = "Verify Your Account") => {
  if (!email || !email.includes("@"))
    throw new Error("Invalid recipient email.");
  if (!otp || otp.length < 4) throw new Error("Invalid OTP code.");

  const htmlContent = getBaseTemplate({
    title: "Verify Your Identity",
    preheader: `Your verification code is ${otp}`,
    body: `
      <p style="font-size: 16px;">Hello,</p>
      <p style="font-size: 16px;">We received a request to verify your identity. Please use the following One-Time Password (OTP) to complete your action:</p>
      
      <div style="text-align: center; margin: 40px 0; background-color: #f3f4f6; border-radius: 12px; padding: 30px; border: 1px dashed #d1d5db;">
        <span style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #111827; font-family: monospace;">${otp}</span>
      </div>
      
      <p style="font-size: 14px; color: #ef4444; font-weight: 500;">Note: This code is valid for 10 minutes only.</p>
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">If you didn't request this code, you can safely ignore this email.</p>
    `,
  });

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = `${subject} | Auth System`;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.sender = {
    name: CONFIG.SENDER_NAME,
    email: CONFIG.SENDER_EMAIL,
  };
  sendSmtpEmail.to = [{ email: email }];

  console.log(
    `[EmailService] Dispatching Brevo OTP to ${email.split("@")[0]}***@***.com`,
  );

  const data = await executeMailSend(sendSmtpEmail);
  console.log(
    `✅ [EmailService] Brevo delivery successful. Message ID: ${data.messageId}`,
  );
  return data;
};

module.exports = sendOTP;
