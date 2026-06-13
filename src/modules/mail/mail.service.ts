/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true'; // true for port 465, false for 587

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure, // TLS: true for 465, false for STARTTLS on 587
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`Mailer transporter initialized (${host}:${port}, secure=${secure})`);
    } else {
      this.logger.warn('SMTP configuration is missing. Emails will be logged to the console.');
    }
  }

  async sendVerificationEmail(email: string, otp: string): Promise<void> {
    const subject = 'Your Verification Code — Luxe E-Commerce';
    const text = `Welcome to Luxe E-Commerce!\n\nYour verification code is: ${otp}\n\nEnter this code to verify your email address.\n\nThis code will expire in 10 minutes.\n\nIf you didn't create an account, you can safely ignore this email.`;
    const html = this.buildVerificationEmailHtml(otp);

    await this.sendMail(email, subject, text, html);
  }

  async sendResetPasswordEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const subject = 'Reset Your Password — Luxe E-Commerce';
    const text = `You requested a password reset for your Luxe E-Commerce account.\n\nPlease reset your password by clicking the link below:\n\n${resetLink}\n\nOr use this reset token: ${token}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`;
    const html = this.buildResetPasswordEmailHtml(resetLink, token);

    await this.sendMail(email, subject, text, html);
  }

  private async sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM') || '"Luxe E-Commerce" <no-reply@luxe.com>';

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
        });
        this.logger.log(`Email sent to ${to} (messageId: ${info.messageId})`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${to}`, (error as Error).stack);
        throw new Error(`Failed to send email to ${to}. Please try again later.`);
      }
    } else {
      // Development fallback: log the email content to the console
      this.logger.log(`
=========================================
[DEV MODE — EMAIL NOT SENT VIA SMTP]
To: ${to}
Subject: ${subject}
-----------------------------------------
${text}
=========================================
      `);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Professional HTML Email Templates (table-based for Outlook compatibility)
  // ────────────────────────────────────────────────────────────────

  private buildVerificationEmailHtml(otp: string): string {
    // Split OTP into individual digits for styled display
    const otpDigits = otp.split('').map(digit => `
              <td style="width: 48px; height: 56px; background-color: #f7fafc; border: 2px solid #e2e8f0; border-radius: 8px; text-align: center; font-family: 'Courier New', monospace; font-size: 28px; font-weight: 700; color: #1a1a2e; letter-spacing: 0;">
                ${digit}
              </td>`).join(`
              <td style="width: 8px;"></td>`);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 2px;">LUXE</h1>
              <p style="margin: 4px 0 0; color: #a0aec0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">E-Commerce</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 8px; color: #1a1a2e; font-size: 22px; font-weight: 600;">Verify Your Email</h2>
              <p style="margin: 0 0 32px; color: #4a5568; font-size: 15px; line-height: 1.6;">
                Welcome to Luxe! Enter the following code to verify your email address:
              </p>

              <!-- OTP Code Display -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
                <tr>
                  ${otpDigits}
                </tr>
              </table>

              <!-- Plain-text OTP for easy copy (triggers native auto-copy on Gmail/iOS/Android) -->
              <p style="margin: 0 0 24px; color: #4a5568; font-size: 15px; text-align: center; line-height: 1.6;">
                Your verification code is: <strong style="font-family: 'Courier New', monospace; font-size: 18px; color: #1a1a2e; letter-spacing: 2px;">${otp}</strong>
              </p>

              <!-- Expiry Notice -->
              <p style="margin: 0 0 8px; color: #718096; font-size: 14px; text-align: center;">
                This code expires in <strong>10 minutes</strong>.
              </p>
              <p style="margin: 0; color: #a0aec0; font-size: 13px; text-align: center;">
                If you didn't create a Luxe account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #cbd5e0; font-size: 11px;">
                &copy; ${new Date().getFullYear()} Luxe E-Commerce. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildResetPasswordEmailHtml(resetLink: string, token: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 2px;">LUXE</h1>
              <p style="margin: 4px 0 0; color: #a0aec0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">E-Commerce</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1a1a2e; font-size: 22px; font-weight: 600;">Reset Your Password</h2>
              <p style="margin: 0 0 24px; color: #4a5568; font-size: 15px; line-height: 1.6;">
                We received a request to reset the password for your Luxe account. Click the button below to choose a new password.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
                <tr>
                  <td style="border-radius: 6px; background-color: #c53030;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; letter-spacing: 0.5px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

              <!-- Token Fallback -->
              <p style="margin: 0 0 8px; color: #718096; font-size: 13px;">If the button doesn't work, copy and paste this token:</p>
              <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; word-break: break-all; font-family: 'Courier New', monospace; font-size: 13px; color: #2d3748;">
                ${token}
              </div>

              <!-- Expiry Notice -->
              <p style="margin: 24px 0 0; color: #a0aec0; font-size: 12px;">
                This reset link expires in <strong>15 minutes</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px; color: #a0aec0; font-size: 12px;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <p style="margin: 0; color: #cbd5e0; font-size: 11px;">
                &copy; ${new Date().getFullYear()} Luxe E-Commerce. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
