import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type {
  PushMessage,
  PushNotificationProvider,
  PushResult,
} from "./push-provider.interface.js";

@Injectable()
export class DevelopmentPushProvider implements PushNotificationProvider {
  private readonly logger = new Logger(DevelopmentPushProvider.name);
  readonly sentPushes: PushMessage[] = [];

  constructor() {
    if (
      process.env["NODE_ENV"] === "production" &&
      !process.env["FIREBASE_SERVICE_ACCOUNT"]
    ) {
      throw new Error(
        "FATAL: DevelopmentPushProvider cannot be used in production without real FCM configuration.",
      );
    }
  }

  async sendPush(message: PushMessage): Promise<PushResult> {
    this.sentPushes.push(message);
    this.logger.log(
      `[DEV PUSH] token=${message.token.slice(0, 10)}... title="${message.title}" body="${message.body}" deepLink=${message.deepLink ?? "none"}`,
    );
    return {
      messageId: `push-${randomUUID()}`,
      success: true,
    };
  }

  clear(): void {
    this.sentPushes.length = 0;
  }
}
