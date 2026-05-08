import nodemailer from "nodemailer";
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_FROM_NAME
} from "../config/index.js";

const smtpPort = Number(SMTP_PORT || 587);
const fromName = SMTP_FROM_NAME || "Axora Homes";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});


const sendEmail = async (options) => {
  try {
    const message = {
      from: `"${fromName}" <${SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(message);
    if (!info.accepted?.includes(options.email)) {
      throw new Error(`Email not accepted by SMTP server. Rejected: ${info.rejected?.join(", ") || "none"}`);
    }

    console.log("Email accepted by SMTP server:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
    return info;
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};


const sendRegisterationOTP = async (toMail, otp) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Axora Homes OTP Verification</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
          font-family: 'Poppins', Arial, sans-serif;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid #e8eef3;
        }
        
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          padding: 30px 20px;
          text-align: center;
          position: relative;
        }
        
        .logo {
          height: 70px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }
        
        .header-title {
          color: white;
          font-size: 26px;
          font-weight: 700;
          margin-top: 15px;
          letter-spacing: 0.5px;
        }
        
        .header-subtitle {
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          font-weight: 400;
          margin-top: 5px;
        }
        
        .content {
          padding: 40px 30px;
          color: #334155;
        }
        
        .greeting {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 10px;
          color: #1e293b;
        }
        
        .message {
          font-size: 16px;
          line-height: 1.6;
          color: #475569;
          margin-bottom: 30px;
        }
        
        .otp-container {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border-radius: 16px;
          padding: 25px;
          text-align: center;
          margin: 30px 0;
          border: 1px solid #e2e8f0;
        }
        
        .otp-label {
          font-size: 15px;
          color: #64748b;
          margin-bottom: 10px;
          font-weight: 500;
        }
        
        .otp-code {
          font-size: 48px;
          font-weight: 800;
          letter-spacing: 10px;
          color: #4f46e5;
          margin: 15px 0;
          font-family: monospace;
          text-shadow: 0 2px 4px rgba(0,0,0,0.05);
          background: white;
          padding: 15px 0;
          border-radius: 12px;
          border: 2px dashed #c7d2fe;
        }
        
        .timer-container {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 20px;
          padding: 12px 20px;
          background-color: #fef3c7;
          border-radius: 10px;
          width: fit-content;
          margin: 20px auto;
          border: 1px solid #fde68a;
        }
        
        .timer-icon {
          width: 20px;
          height: 20px;
          margin-right: 8px;
          color: #d97706;
        }
        
        .timer-text {
          color: #92400e;
          font-weight: 600;
          font-size: 15px;
        }
        
        .instructions {
          background-color: #f8fafc;
          border-left: 4px solid #4f46e5;
          padding: 18px;
          border-radius: 8px;
          margin: 30px 0;
        }
        
        .instructions-title {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 8px;
          font-size: 16px;
        }
        
        .instructions-list {
          margin: 0;
          padding-left: 20px;
          color: #475569;
          font-size: 14px;
          line-height: 1.5;
        }
        
        .instructions-list li {
          margin-bottom: 6px;
        }
        
        .security-note {
          font-size: 14px;
          color: #94a3b8;
          text-align: center;
          margin-top: 30px;
          font-style: italic;
          padding: 15px;
          background-color: #f1f5f9;
          border-radius: 10px;
        }
        
        .footer {
          background-color: #1e293b;
          color: #cbd5e1;
          padding: 25px 30px;
          text-align: center;
          font-size: 14px;
        }
        
        .footer-links {
          margin-bottom: 15px;
        }
        
        .footer-link {
          color: #60a5fa;
          text-decoration: none;
          margin: 0 10px;
          font-weight: 500;
        }
        
        .footer-link:hover {
          text-decoration: underline;
        }
        
        .copyright {
          color: #94a3b8;
          font-size: 13px;
          margin-top: 10px;
        }
        
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 600;
          margin-top: 15px;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }
        
        .button:hover {
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
          transform: translateY(-2px);
        }
        
        @media (max-width: 600px) {
          .content {
            padding: 30px 20px;
          }
          
          .otp-code {
            font-size: 36px;
            letter-spacing: 8px;
          }
          
          .header {
            padding: 25px 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
     
          <div class="header-title">OTP Verification</div>
          <div class="header-subtitle">Secure Access Code</div>
        </div>
        
        <div class="content">
          <div class="greeting">Hello,</div>
          <div class="message">
            Thank you for choosing Axora Homes! To complete your registration and secure your account, 
            please use the One-Time Password (OTP) below:
          </div>
          
          <div class="otp-container">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">${otp}</div>
            <div class="timer-container">
              <svg class="timer-icon" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
              </svg>
              <div class="timer-text">Valid for 10 minutes only</div>
            </div>
          </div>
          
          
          <div class="instructions">
            <div class="instructions-title">Instructions:</div>
            <ul class="instructions-list">
              <li>Enter this OTP on the verification page to complete your registration</li>
              <li>Do not share this OTP with anyone for security reasons</li>
              <li>If you didn't request this OTP, please ignore this email</li>
              <li>For assistance, contact our support team</li>
            </ul>
          </div>
          
          <div class="security-note">
            🔒 This is an automated message. Please do not reply to this email. 
            Axora Homes will never ask you for your password or OTP via email.
          </div>
        </div>
        
        <div class="footer">
          <div class="copyright">
            © ${new Date().getFullYear()} Axora Homes. All rights reserved.<br/>
            This email was sent to ${toMail}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    email: toMail,
    subject: "Axora Homes - Registration OTP Verification",
    text: `Your Axora Homes registration OTP is ${otp}. It is valid for 10 minutes.`,
    html
  });


};


const sendRegistrationOTP = async (toMail, otp) => {
  
  const options = {
    email: toMail,
    subject: "Axora Homes - Password Reset OTP",
    text: `Your password reset OTP is ${otp}. It is valid for 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
       
        </div>
        <h2 style="color: #333; text-align: center;">Verify Your OTP For Password Reset</h2>
        <p style="font-size: 16px; color: #555;">Dear User,</p>
        <p style="font-size: 16px; color: #555;">To complete your Axora Homes password reset, please use the following OTP:</p>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; margin: 20px 0; border-radius: 6px;">
          <h1 style="margin: 0; color: #2c3e50; letter-spacing: 3px;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #777; text-align: center;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="font-size: 16px; color: #555;">If you didn't request this OTP, please ignore this email or contact support.</p>
        <div style="margin-top: 30px; text-align: center; font-size: 14px; color: #999;">
          <p>Best regards,<br>The Axora Homes Team</p>
          <p>© ${new Date().getFullYear()} Axora Homes. All rights reserved.</p>
        </div>
      </div>
    `,
    otp: otp
  };


  try {
    await sendEmail(options);
;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

const sendRegistrationCredentialsEmail = async ({ toEmail, name, userId, password, referralCode }) => {
  const options = {
    email: toEmail,
    subject: "Welcome to Axora Homes! Your Registration Details",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      
        <h2 style="color: #333; text-align: center;">Welcome, ${name}!</h2>
        <p style="font-size: 16px; color: #555;">Thanks for registering with Axora Homes.</p>
        <p style="font-size: 16px; color: #555;">Here are your login details:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p><strong>Referral Code:</strong> ${referralCode}</p>
        </div>
        <p style="font-size: 16px; color: #555;">Keep this information safe and do not share it with anyone.</p>
        <p style="font-size: 16px; color: #555;">We're glad to have you onboard!</p>
        <div style="margin-top: 30px; text-align: center; font-size: 14px; color: #999;">
          <p>Best regards,<br>The Axora Homes Team</p>
          <p>© ${new Date().getFullYear()} Axora Homes. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    await sendEmail(options);

  } catch (error) {
    console.error('Error sending registration email:', error);
    throw new Error('Failed to send registration email');
  }
};

const sendbuynftEmailOtp = async (toEmail, otp) => {
  try {
    const transporter = nodemailer.createTransport(nodemailerOptions);

    await transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to: toEmail,
      subject: "NFT Purchase OTP",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://backend.nftstoke.com/uploads/photos/Growify.png" alt="Company Logo">
        </div>
        <h2 style="color: #333; text-align: center;">Verify Your OTP For NFT Purchase</h2>
        <p style="font-size: 16px; color: #555;">Dear User,</p>
        <p style="font-size: 16px; color: #555;">Thanks for giving your valuable time to NFT! To complete your NFT-BUY Process, please use the following OTP:</p>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; margin: 20px 0; border-radius: 6px;">
          <h1 style="margin: 0; color: #2c3e50; letter-spacing: 3px;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #777; text-align: center;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="font-size: 16px; color: #555;">If you didn't request this OTP, please ignore this email or contact support.</p>
        <div style="margin-top: 30px; text-align: center; font-size: 14px; color: #999;">
          <p>Best regards,<br>The GROWIFY Team</p>
          <p>© ${new Date().getFullYear()} GROWIFY. All rights reserved.</p>
        </div>
      </div>
    `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return { success: false, error };
  }
};

const withdrawOtp = async (toEmail, otp) => {
  try {
    const transporter = nodemailer.createTransport(nodemailerOptions);

    await transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to: toEmail,
      subject: "Verification Otp For Withdraw",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://backend.nftstoke.com/uploads/photos/Grfy.png" alt="Company Logo">
        </div>
        <h2 style="color: #333; text-align: center;">Verify Your OTP For Withdraw</h2>
        <p style="font-size: 16px; color: #555;">Dear User,</p>
        <p style="font-size: 16px; color: #555;">Thanks for giving your valuable time to GROWIFY! To complete your Withdraw Process, please use the following OTP:</p>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; margin: 20px 0; border-radius: 6px;">
          <h1 style="margin: 0; color: #2c3e50; letter-spacing: 3px;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #777; text-align: center;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="font-size: 16px; color: #555;">If you didn't request this OTP, please ignore this email or contact support.</p>
        <div style="margin-top: 30px; text-align: center; font-size: 14px; color: #999;">
          <p>Best regards,<br>The GROWIFY Team</p>
          <p>© ${new Date().getFullYear()} GROWIFY. All rights reserved.</p>
        </div>
      </div>
    `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return { success: false, error };
  }
};

export { sendRegistrationOTP, sendbuynftEmailOtp, sendRegistrationCredentialsEmail, sendRegisterationOTP, withdrawOtp }
