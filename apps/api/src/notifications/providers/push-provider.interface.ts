export const PUSH_PROVIDER = Symbol("PUSH_PROVIDER");

export interface PushMessage {
  readonly token: string;
  readonly title: string;
  readonly body: string;
  readonly deepLink?: string;
  readonly data?: Record<string, string>;
}

export interface PushResult {
  readonly success: boolean;
  readonly messageId?: string;
  readonly error?: string;
}

export interface PushNotificationProvider {
  sendPush(message: PushMessage): Promise<PushResult>;
}
