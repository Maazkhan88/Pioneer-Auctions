import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Inject,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { RegisterDeviceTokenRequestSchema } from "@pioneer/contracts";
import type { Request } from "express";

import { SessionService } from "../identity/session.service.js";
import { NotificationsService } from "./notifications.service.js";

@Controller("/api/v1/me/device-tokens")
export class DeviceTokensController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
    @Inject(SessionService)
    private readonly session: SessionService,
  ) {}

  @Post()
  async registerToken(
    @Req() request: Request,
    @Body() body: unknown,
  ): Promise<unknown> {
    const account = await this.session.requireTestHeaderAccount(request);
    const parsed = RegisterDeviceTokenRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        errors: parsed.error.issues,
        message: "Invalid device token format",
      });
    }
    return this.notificationsService.registerDeviceToken(
      account.id,
      parsed.data.token,
      parsed.data.platform,
    );
  }

  @Delete(":token")
  async unregisterToken(
    @Req() request: Request,
    @Param("token") token: string,
  ): Promise<unknown> {
    const account = await this.session.requireTestHeaderAccount(request);
    return this.notificationsService.unregisterDeviceToken(account.id, token);
  }
}
