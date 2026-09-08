/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as dns from 'dns';

// Custom DNS lookup function to guarantee Nodemailer ONLY uses IPv4 addresses (family 4)
// This fixes cloud server errors like "connect ENETUNREACH 2607:f8b0:400e:c0d::6c:465"
const customIpv4Lookup = (
  hostname: string,
  options: any,
  callback: (err: NodeJS.ErrnoException | null, address: string | any, family?: number) => void,
) => {
  return dns.lookup(hostname, { family: 4 }, callback);
};

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    let host = this.configService.get<string>('SMTP_HOST')?.trim();
    let port = this.configService.get<number | string>('SMTP_PORT');
    let user = this.configService.get<string>('SMTP_USER')?.trim() || this.configService.get<string>('BREVO_SENDER_EMAIL')?.trim();
    const rawPass = this.configService.get<string>('SMTP_PASS')?.trim() || this.configService.get<string>('BREVO_API_KEY')?.trim();
    const pass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;
    let secureEnv = String(this.configService.get<string | boolean>('SMTP_SECURE') ?? '').trim();

    // Smart Brevo Auto-Detector: If password is a Brevo key (starts with xsmtpsib- or xkeysib-)
    if (pass && (pass.startsWith('xsmtpsib-') || pass.startsWith('xkeysib-'))) {
      host = 'smtp-relay.brevo.com';
      port = 587;
      secureEnv = 'false';
      if (!user || !user.includes('@smtp-brevo.com')) {
        user = '835d50001@smtp-brevo.com';
      }
    }

    if (!host) host = 'smtp.gmail.com';
    const portNum = port ? Number(port) : 587;
    const secure = secureEnv === 'true' || portNum === 465;

    const isValidConfig =
      Boolean(host) &&
      Boolean(user) &&
      Boolean(pass) &&
      pass !== 'your-app-password' &&
      pass !== 'your_mailtrap_pass';

    if (isValidConfig) {
      const isGmail = host.toLowerCase().includes('gmail.com');

      const transportOptions: any = isGmail
        ? {
            service: 'gmail',
            auth: {
              user,
              pass,
            },
            lookup: customIpv4Lookup,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          }
        : {
            host,
            port: portNum,
            secure,
            auth: {
              user,
              pass,
            },
            family: 4,
            lookup: customIpv4Lookup,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
            tls: {
              rejectUnauthorized: false,
            },
          };

      this.transporter = nodemailer.createTransport(transportOptions);
    }
  }

  async sendVerificationEmail(email: string, otp: string): Promise<boolean> {
    const subject = 'Your Verification Code — Luxe E-Commerce';
    const text = `Welcome to Luxe E-Commerce!\n\nYour verification code is: ${otp}\n\nEnter this code to verify your email address.\n\nThis code will expire in 10 minutes.\n\nIf you didn't create an account, you can safely ignore this email.`;
    const html = this.buildVerificationEmailHtml(otp);

    return await this.sendMail(email, subject, text, html);
  }

  async sendResetPasswordEmail(email: string, token: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const subject = 'Reset Your Password — Luxe E-Commerce';
    const text = `You requested a password reset for your Luxe E-Commerce account.\n\nPlease reset your password by clicking the link below:\n\n${resetLink}\n\nOr use this reset token: ${token}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`;
    const html = this.buildResetPasswordEmailHtml(resetLink, token);

    return await this.sendMail(email, subject, text, html);
  }

  private async sendMail(to: string, subject: string, text: string, html: string): Promise<boolean> {
    // 1. Try Brevo HTTPS REST API First (Port 443 - Zero domain required, 300 free emails/day to ANY recipient)
    const brevoApiKey = this.configService.get<string>('BREVO_API_KEY')?.trim();
    if (brevoApiKey) {
      try {
        const senderEmail =
          this.configService.get<string>('BREVO_SENDER_EMAIL')?.trim() ||
          this.configService.get<string>('SMTP_USER')?.trim() ||
          'mdkabirulhossainj@gmail.com';

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': brevoApiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'Luxe E-Commerce', email: senderEmail },
            to: [{ email: to }],
            subject,
            htmlContent: html,
            textContent: text,
          }),
        });

        if (response.ok) {
          const resData: any = await response.json();
          this.logger.log(`Email sent successfully to ${to} via Brevo HTTPS API (messageId: ${resData.messageId || 'ok'})`);
          return true;
        } else {
          const errData: any = await response.json();
          this.logger.error(`Brevo API returned error for ${to}: ${JSON.stringify(errData)}`);
        }
      } catch (err) {
        this.logger.error(`Brevo API request failed for ${to}: ${(err as Error).message}`);
      }
    }

    // 2. Fallback to Nodemailer SMTP
    if (this.transporter) {
      try {
        let from = this.configService.get<string>('SMTP_FROM') || '"Luxe E-Commerce" <no-reply@luxe.com>';
        from = from.replace(/^["']|["']$/g, '').trim();

        const info: any = await this.transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
        });
        const messageId = String(info?.messageId || 'unknown');
        this.logger.log(`Email sent to ${to} via SMTP (messageId: ${messageId})`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send email via SMTP to ${to}: ${(error as Error).message}`);
        return false;
      }
    }

    // 3. Fallback: Dev mode logging
    this.logger.warn(`[DEV MODE / UNCONFIGURED MAILER] Real email NOT sent to ${to}. Set BREVO_API_KEY or SMTP variables.`);
    this.logger.log(`
=========================================
[DEV MODE — EMAIL NOT SENT]
To: ${to}
Subject: ${subject}
-----------------------------------------
${text}
=========================================
    `);
    return false;
  }

  // ────────────────────────────────────────────────────────────────
  // Professional HTML Email Templates (table-based for Outlook compatibility)
  // ────────────────────────────────────────────────────────────────

  private buildVerificationEmailHtml(otp: string): string {
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

              <!-- OTP Code Display (Styled & Fully Copyable) -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 32px;">
                <tr>
                  <td align="center" style="background-color: #f7fafc; border: 2px dashed #cbd5e0; border-radius: 8px; padding: 16px 32px; text-align: center;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; color: #1a1a2e; letter-spacing: 6px; display: inline-block;">
                      ${otp}
                    </span>
                  </td>
                </tr>
              </table>

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
