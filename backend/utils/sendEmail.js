const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const gmailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  connectionTimeout: 5000,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const sendOTP = async (email, subject, otp) => {
  const textMessage = `
Hello,

Your verification code is: ${otp}

This code will expire in 5 minutes.

Login System Security Team
`;

  const htmlMessage = `
  <div style="font-family:Arial">
    <h2>Login System Verification</h2>
    <p>Your OTP:</p>
    <h1>${otp}</h1>
    <p>This code expires in 5 minutes.</p>
  </div>
  `;

  try {
    await gmailTransporter.sendMail({
      from: `Login System <${process.env.GMAIL_USER}>`,
      to: email,
      subject: subject || "Your Verification Code",
      text: textMessage,
      html: htmlMessage,
    });

    console.log("Email sent via Gmail SMTP");
    return;
  } catch (gmailError) {
    console.log("Gmail failed, switching to SendGrid");

    try {
      await sgMail.send({
        to: email,
        from: `Login System <${process.env.GMAIL_USER}>`,
        subject: subject || "Your Verification Code",
        text: textMessage,
        html: htmlMessage,
      });

      console.log("Email sent via SendGrid");
    } catch (sendgridError) {
      console.error("Both Gmail and SendGrid failed:", sendgridError);
      throw sendgridError;
    }
  }
};

module.exports = sendOTP;
