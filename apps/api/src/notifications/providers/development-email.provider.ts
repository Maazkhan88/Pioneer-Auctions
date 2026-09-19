import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type {
  EmailMessage,
  EmailNotificationProvider,
  EmailResult,
} from "./email-provider.interface.js";

@Injectable()
export class DevelopmentEmailProvider implements EmailNotificationProvider {
  private readonly logger = new Logger(DevelopmentEmailProvider.name);
  readonly sentEmails: EmailMessage[] = [];

  constructor() {
    if (
      process.env["NODE_ENV"] === "production" &&
      !process.env["SMTP_HOST"] &&
      !process.env["AWS_SES_REGION"]
    ) {
      throw new Error(
        "FATAL: DevelopmentEmailProvider cannot be used in production without real email configuration.",
      );
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    this.sentEmails.push(message);
    this.logger.log(
      `[DEV EMAIL] to=${message.to} subject="${message.subject}"`,
    );
    return {
      messageId: `email-${randomUUID()}`,
      success: true,
    };
  }

  clear(): void {
    this.sentEmails.length = 0;
  }
}
