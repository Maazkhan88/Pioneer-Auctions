export const EMAIL_PROVIDER = Symbol("EMAIL_PROVIDER");

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
}

export interface EmailResult {
  readonly success: boolean;
  readonly messageId?: string;
  readonly error?: string;
}

export interface EmailNotificationProvider {
  sendEmail(message: EmailMessage): Promise<EmailResult>;
}
