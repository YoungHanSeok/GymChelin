// 이메일 인증과 계정 찾기 메일 발송을 담당한다.
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  replyTo?: string;
  user?: string;
  pass?: string;
};

const MAIL_UNAVAILABLE_MESSAGE =
  '현재 메일을 발송할 수 없습니다. 잠시 후 다시 시도해 주세요.';

@Injectable()
export class UserMailService {
  private transporter: Transporter | null = null;

  async verifyConnection() {
    const transporter = this.getTransporter();

    try {
      await transporter.verify();
    } catch {
      throw new ServiceUnavailableException(MAIL_UNAVAILABLE_MESSAGE);
    }
  }

  async sendMail(input: SendMailInput) {
    const config = this.getConfig();
    const transporter = this.getTransporter(config);

    try {
      await transporter.sendMail({
        from: config.from,
        to: input.to,
        replyTo: config.replyTo,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
    } catch {
      throw new ServiceUnavailableException(MAIL_UNAVAILABLE_MESSAGE);
    }
  }

  private getTransporter(config = this.getConfig()) {
    this.transporter ??= nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user && config.pass
          ? {
              user: config.user,
              pass: config.pass,
            }
          : undefined,
    });

    return this.transporter;
  }

  private getConfig(): MailConfig {
    const host = process.env.MAIL_HOST ?? process.env.SMTP_HOST;
    const portValue = process.env.MAIL_PORT ?? process.env.SMTP_PORT ?? '587';
    const port = Number.parseInt(portValue, 10);
    const user = process.env.MAIL_USER ?? process.env.SMTP_USER;
    const pass = process.env.MAIL_PASS ?? process.env.SMTP_PASS;
    const from = process.env.MAIL_FROM ?? process.env.SMTP_FROM ?? user;
    const replyTo = process.env.MAIL_REPLY_TO ?? process.env.SMTP_REPLY_TO;

    if (!host || !from || !Number.isInteger(port) || port <= 0) {
      throw new ServiceUnavailableException(MAIL_UNAVAILABLE_MESSAGE);
    }

    if ((user && !pass) || (!user && pass)) {
      throw new ServiceUnavailableException(MAIL_UNAVAILABLE_MESSAGE);
    }

    return {
      host,
      port,
      secure: this.parseSecure(port),
      from,
      replyTo,
      user,
      pass,
    };
  }

  private parseSecure(port: number) {
    const value = process.env.MAIL_SECURE ?? process.env.SMTP_SECURE;

    if (!value) {
      return port === 465;
    }

    return ['1', 'true', 'y', 'yes'].includes(value.toLowerCase());
  }
}
