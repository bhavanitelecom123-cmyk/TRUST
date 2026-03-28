import { Resend } from 'resend';

// Lazy initialize Resend client to avoid build-time errors if API key is missing
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send OTP email for passwordless login
 */
export async function sendOTPEmail(email: string, otp: number): Promise<{ success: boolean; error?: string }> {
  try {
    const subject = 'Your Login Code - Caste Community Portal';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Caste Community Portal</h1>
        </div>
        <div style="background: #f9fafb; padding: 40px 20px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #111827; margin-top: 0;">Your Login Code</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            You requested to sign in to your account. Use the following one-time password (OTP) to complete your login:
          </p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px;">${otp}</div>
            <div style="color: #6b7280; font-size: 14px; margin-top: 10px;">Valid for 10 minutes</div>
          </div>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
            If you did not request this code, please ignore this email. This code will expire in 10 minutes and can only be used once.
          </p>
          <p style="color: #4b5563; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Best regards,<br>
            <strong>Caste Community Portal Team</strong>
          </p>
        </div>
        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    `;

    const text = `
      Your Login Code - Caste Community Portal

      You requested to sign in to your account. Use the following one-time password (OTP) to complete your login:

      ${otp}

      This code is valid for 10 minutes and can only be used once.

      If you did not request this code, please ignore this email.

      Best regards,
      Caste Community Portal Team

      This is an automated message, please do not reply.
    `;

    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: process.env.RESEND_EMAIL_FROM || 'noreply@castecommunity.com',
      to: email,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    return { success: true };
  } catch (error) {
    console.error('sendOTPEmail error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const subject = 'Reset Your Password - Caste Community Portal';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Caste Community Portal</h1>
        </div>
        <div style="background: #f9fafb; padding: 40px 20px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #111827; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            You requested to reset your password. Click the button below to choose a new password:
          </p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetUrl}"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <strong>Important:</strong> This link will expire in 1 hour. If you did not request a password reset, please ignore this email.
          </p>
          <p style="color: #4b5563; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            If the button above doesn't work, copy and paste this URL into your browser:<br>
            <code style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all;">${resetUrl}</code>
          </p>
          <p style="color: #4b5563; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            <strong>Caste Community Portal Team</strong>
          </p>
        </div>
        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    `;

    const text = `
      Reset Your Password - Caste Community Portal

      You requested to reset your password. Click the link below to choose a new password:

      ${resetUrl}

      Important: This link will expire in 1 hour. If you did not request a password reset, please ignore this email.

      If the link doesn't work, copy and paste the URL into your browser.

      Best regards,
      Caste Community Portal Team

      This is an automated message, please do not reply.
    `;

    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: process.env.RESEND_EMAIL_FROM || 'noreply@castecommunity.com',
      to: email,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    return { success: true };
  } catch (error) {
    console.error('sendPasswordResetEmail error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Generate a cryptographically secure OTP (6-digit)
 */
export function generateOTP(): number {
  return Math.floor(100000 + Math.random() * 900000);
}

/**
 * Generate a secure reset token (64-character hex string)
 */
export function generateResetToken(): string {
  return require('crypto').randomBytes(32).toString('hex');
}
