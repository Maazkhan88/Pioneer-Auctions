import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Post,
  UseGuards,
} from "@nestjs/common";

import { AuditService } from "../audit/audit.service.js";
import { AdminPermissionGuard } from "../identity/admin-permission.guard.js";
import { RequirePermission } from "../identity/permission.decorator.js";
import { parseCreateAuctionInput } from "./auction.dto.js";
import type { AdminAuctionView } from "./auction.dto.js";
import { AuctionsRepository } from "./auctions.repository.js";

@Controller("/api/v1/admin/auctions")
@UseGuards(AdminPermissionGuard)
export class AdminAuctionsController {
  constructor(
    @Inject(AuctionsRepository)
    private readonly auctions: AuctionsRepository,
    @Inject(AuditService)
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermission("admin.auctions.read")
  list(): Promise<AdminAuctionView[]> {
    return this.auctions.list();
  }

  @Post()
  @RequirePermission("admin.auctions.write")
  async create(
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
    @Headers("x-pioneer-test-account-id") actorAccountId: string | undefined,
  ): Promise<AdminAuctionView> {
    const created = await this.auctions.create(parseCreateAuctionInput(body));
    await this.audit.record({
      action: "admin.auctions.create",
      actorAccountId: actorAccountId ?? null,
      correlationId,
      metadata: { lifecycle: created.lifecycle },
      subjectId: created.id,
      subjectType: "auction",
    });
    return created;
  }
}
