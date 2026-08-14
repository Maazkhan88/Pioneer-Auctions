import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { AuditService } from "../audit/audit.service.js";
import { AdminPermissionGuard } from "../identity/admin-permission.guard.js";
import { RequirePermission } from "../identity/permission.decorator.js";
import {
  parseAuctionControlInput,
  parseCreateAuctionInput,
  parseUpdateAuctionInput,
} from "./auction.dto.js";
import type {
  AdminAuctionControlResult,
  AdminAuctionView,
} from "./auction.dto.js";
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

  @Patch(":auctionId")
  @RequirePermission("admin.auctions.write")
  async update(
    @Param("auctionId") auctionId: string,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
    @Headers("x-pioneer-test-account-id") actorAccountId: string | undefined,
  ): Promise<AdminAuctionView> {
    const input = parseUpdateAuctionInput(body);
    const updated = await this.auctions.update(auctionId, input);
    await this.audit.record({
      action: "admin.auctions.update",
      actorAccountId: actorAccountId ?? null,
      correlationId,
      metadata: { fields: Object.keys(input) },
      subjectId: updated.id,
      subjectType: "auction",
    });
    return updated;
  }

  @Post(":auctionId/pause")
  @RequirePermission("admin.auctions.write")
  async pause(
    @Param("auctionId") auctionId: string,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
    @Headers("x-pioneer-test-account-id") actorAccountId: string | undefined,
  ): Promise<AdminAuctionControlResult> {
    const input = parseAuctionControlInput(body);
    const result = await this.auctions.pause(auctionId);
    await this.recordControlAudit({
      action: "admin.auctions.pause",
      actorAccountId,
      correlationId,
      input,
      result,
    });
    return result;
  }

  @Post(":auctionId/resume")
  @RequirePermission("admin.auctions.write")
  async resume(
    @Param("auctionId") auctionId: string,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
    @Headers("x-pioneer-test-account-id") actorAccountId: string | undefined,
  ): Promise<AdminAuctionControlResult> {
    const input = parseAuctionControlInput(body);
    const result = await this.auctions.resume(auctionId);
    await this.recordControlAudit({
      action: "admin.auctions.resume",
      actorAccountId,
      correlationId,
      input,
      result,
    });
    return result;
  }

  @Post(":auctionId/cancel")
  @RequirePermission("admin.auctions.write")
  async cancel(
    @Param("auctionId") auctionId: string,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
    @Headers("x-pioneer-test-account-id") actorAccountId: string | undefined,
  ): Promise<AdminAuctionControlResult> {
    const input = parseAuctionControlInput(body);
    const result = await this.auctions.cancel(auctionId);
    await this.recordControlAudit({
      action: "admin.auctions.cancel",
      actorAccountId,
      correlationId,
      input,
      result,
    });
    return result;
  }

  private async recordControlAudit(parameters: {
    readonly action: string;
    readonly actorAccountId: string | undefined;
    readonly correlationId: string;
    readonly input: { readonly note: string | null; readonly reason: string };
    readonly result: AdminAuctionControlResult;
  }): Promise<void> {
    await this.audit.record({
      action: parameters.action,
      actorAccountId: parameters.actorAccountId ?? null,
      correlationId: parameters.correlationId,
      metadata: {
        decision: parameters.result.decision,
        lifecycle: parameters.result.lifecycle,
        note: parameters.input.note,
        reason: parameters.input.reason,
      },
      subjectId: parameters.result.auctionId,
      subjectType: "auction",
    });
  }
}
