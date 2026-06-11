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

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        auth: {
          user,
          pass,
        },
      });
      this.logger.log('Mailer transporter initialized successfully.');
    } else {
      this.logger.warn('SMTP configuration is missing. Emails will be logged to the console.');
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    const subject = 'Verify your Luxe E-Commerce Email';
    const text = `Welcome to Luxe E-Commerce!\n\nPlease verify your email by clicking the link below or entering the verification token: \n\nVerification Link: ${verificationLink}\nVerification Token: ${token}\n\nThis token will expire in 24 hours.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">Welcome to Luxe E-Commerce!</h2>
        <p>Please verify your email by clicking the button below:</p>
        <div style="margin: 20px 0;">
          <a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email</a>
        </div>
        <p>Or use this token directly: <strong>${token}</strong></p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">This token expires in 24 hours.</p>
      </div>
    `;

    await this.sendMail(email, subject, text, html);
  }

  async sendResetPasswordEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const subject = 'Reset your Luxe E-Commerce Password';
    const text = `You requested a password reset.\n\nPlease reset your password by clicking the link below: \n\nReset Link: ${resetLink}\nReset Token: ${token}\n\nThis link will expire in 15 minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">Reset your Luxe E-Commerce Password</h2>
        <p>Please click the button below to reset your password:</p>
        <div style="margin: 20px 0;">
          <a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>Or use this token directly: <strong>${token}</strong></p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">This token expires in 15 minutes.</p>
      </div>
    `;

    await this.sendMail(email, subject, text, html);
  }

  private async sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM') || '"Luxe E-Commerce" <no-reply@luxe.com>';

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
        });
        this.logger.log(`Email successfully sent to ${to}`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${to}:`, error);
      }
    } else {
      this.logger.log(`
=========================================
[MOCK MAIL SENT]
To: ${to}
Subject: ${subject}
Content: ${text}
=========================================
      `);
    }
  }
}
