import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { renderFile } from 'ejs';
import { join } from 'node:path';

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  async sendEmailChangeCode(to: string, code: string): Promise<void> {
    await this.sendCode(to, code, 'Verify your new email address', 'email-change-otp.ejs');
  }

  async sendSignupVerificationCode(to: string, code: string): Promise<void> {
    await this.sendCode(to, code, 'Verify your Northstar account', 'signup-otp.ejs');
  }

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    await this.sendCode(to, code, 'Reset your Northstar password', 'password-reset-otp.ejs');
  }

  private async sendCode(
    to: string,
    code: string,
    subject: string,
    template: string,
  ): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const from = this.config.get<string>('EMAIL_FROM');
    const user = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASSWORD');

    if (!host || !from || !Number.isInteger(port) || port <= 0) {
      throw new InternalServerErrorException(
        'Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, and EMAIL_FROM.',
      );
    }

    const html = await renderFile(
      join(__dirname, 'templates', template),
      { code, expiresMinutes: 10 },
    );
    const transporter = createTransport({
      host,
      port,
      secure: this.config.get<string>('SMTP_SECURE') === 'true' || port === 465,
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
  }
}
