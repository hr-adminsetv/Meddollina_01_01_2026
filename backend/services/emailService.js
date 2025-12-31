import pkg from 'nodemailer';
const { createTransport } = pkg;
import dotenv from 'dotenv';

dotenv.config();

/**
 * Email Service
 * Handles sending emails via SMTP
 */
class EmailService {
  constructor() {
    this.transporter = createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  /**
   * Send OTP email for password reset
   */
  async sendPasswordResetOTP(email, otp, firstName) {
    const mailOptions = {
      from: `"Meddollina" <${process.env.MAIL_FROM}>`,
      to: email,
      subject: 'Password Reset OTP - Meddollina',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #FF6B6B; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #FF6B6B; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi${firstName ? ` ${firstName}` : ''},</p>
              <p>We received a request to reset your password for your Meddollina account.</p>
              <p>Your One-Time Password (OTP) is:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              
              <p><strong>⏰ This OTP will expire in 10 minutes.</strong></p>
              <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
              
              <div class="footer">
                <p>© 2024 Meddollina. All rights reserved.</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent to: ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send password reset confirmation email
   */
  async sendPasswordResetConfirmation(email, firstName) {
    const mailOptions = {
      from: `"Meddollina" <${process.env.MAIL_FROM}>`,
      to: email,
      subject: 'Password Changed Successfully - Meddollina',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Password Changed Successfully</h1>
            </div>
            <div class="content">
              <div class="success-icon">🎉</div>
              <p>Hi${firstName ? ` ${firstName}` : ''},</p>
              <p>Your password has been changed successfully!</p>
              <p>You can now log in to your Meddollina account with your new password.</p>
              <p><strong>If you didn't make this change,</strong> please contact our support team immediately.</p>
              
              <div class="footer">
                <p>© 2024 Meddollina. All rights reserved.</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset confirmation sent to: ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}

export default new EmailService();
