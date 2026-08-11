import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from "@nestjs/common";

import { AuditService } from "../audit/audit.service.js";
import { AdminPermissionGuard } from "../identity/admin-permission.guard.js";
import { RequirePermission } from "../identity/permission.decorator.js";
import { type AdminLotView, parseCreateLotInput } from "./lot.dto.js";
import { LotsRepository } from "./lots.repository.js";

@Controller("/api/v1/admin/lots")
@UseGuards(AdminPermissionGuard)
export class AdminLotsController {
  constructor(
    private readonly lots: LotsRepository,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermission("admin.auctions.read")
  list(): Promise<AdminLotView[]> {
    return this.lots.list();
  }

  @Post()
  @RequirePermission("admin.auctions.write")
  async create(
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
    @Headers("x-pioneer-test-account-id") actorAccountId: string | undefined,
  ): Promise<AdminLotView> {
    const created = await this.lots.create(parseCreateLotInput(body));
    await this.audit.record({
      action: "admin.lots.create",
      actorAccountId: actorAccountId ?? null,
      correlationId,
      metadata: {
        auctionId: created.auctionId,
        lotNumber: created.lotNumber,
      },
      subjectId: created.id,
      subjectType: "lot",
    });
    return created;
  }
}
