import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Req,
} from "@nestjs/common";
import { UpdateNotificationPreferencesRequestSchema } from "@pioneer/contracts";
import type { Request } from "express";

import { SessionService } from "../identity/session.service.js";
import { NotificationsService } from "./notifications.service.js";

@Controller("/api/v1/me/preferences")
export class PreferencesController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
    @Inject(SessionService)
    private readonly session: SessionService,
  ) {}

  @Get()
  async getPreferences(@Req() request: Request): Promise<unknown> {
    const account = await this.session.requireTestHeaderAccount(request);
    return this.notificationsService.getPreferences(account.id);
  }

  @Patch()
  async updatePreferences(
    @Req() request: Request,
    @Body() body: unknown,
  ): Promise<unknown> {
    const account = await this.session.requireTestHeaderAccount(request);
    const parsed = UpdateNotificationPreferencesRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        errors: parsed.error.issues,
        message: "Invalid preferences format",
      });
    }
    return this.notificationsService.updatePreferences(account.id, parsed.data);
  }
}
