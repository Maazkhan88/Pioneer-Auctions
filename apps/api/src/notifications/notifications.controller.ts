import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";

import { SessionService } from "../identity/session.service.js";
import { NotificationsService } from "./notifications.service.js";

@Controller("/api/v1/me/notifications")
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
    @Inject(SessionService)
    private readonly session: SessionService,
  ) {}

  @Get()
  async listNotifications(
    @Req() request: Request,
    @Query("limit") limitStr?: string,
  ): Promise<unknown> {
    const account = await this.session.requireTestHeaderAccount(request);
    const limit = limitStr ? Number.parseInt(limitStr, 10) : 50;
    return this.notificationsService.listNotifications(account.id, limit);
  }

  @Post(":id/read")
  async markNotificationRead(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<unknown> {
    const account = await this.session.requireTestHeaderAccount(request);
    return this.notificationsService.markNotificationRead(account.id, id);
  }

  @Post("read-all")
  async markAllRead(@Req() request: Request): Promise<unknown> {
    const account = await this.session.requireTestHeaderAccount(request);
    return this.notificationsService.markAllRead(account.id);
  }
}
