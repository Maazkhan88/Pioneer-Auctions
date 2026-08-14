import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";

import { AuditService } from "../audit/audit.service.js";
import { AdminPermissionGuard } from "../identity/admin-permission.guard.js";
import { RequirePermission } from "../identity/permission.decorator.js";
import {
  type AdminAuditEventsView,
  type AdminDashboardView,
  type FinalBidDecisionResult,
  type FinalBidApprovalsView,
  parseRejectFinalBidInput,
  toMoney,
} from "./admin-operations.dto.js";
import { AdminOperationsRepository } from "./admin-operations.repository.js";

@Controller("/api/v1/admin")
@UseGuards(AdminPermissionGuard)
export class AdminOperationsController {
  constructor(
    @Inject(AdminOperationsRepository)
    private readonly operations: AdminOperationsRepository,
    @Inject(AuditService)
    private readonly audit: AuditService,
  ) {}

  @Get("dashboard")
  @RequirePermission("admin.auctions.read")
  async dashboard(): Promise<AdminDashboardView> {
    return {
      contractVersion: 1,
      generatedAt: new Date().toISOString(),
      metrics: await this.operations.getDashboardMetrics(),
    };
  }

  @Get("audit-events")
  @RequirePermission("admin.audit.read")
  async auditEvents(): Promise<AdminAuditEventsView> {
    return {
      contractVersion: 1,
      events: await this.operations.listAuditEvents(),
      generatedAt: new Date().toISOString(),
    };
  }

  @Get("final-bid-approvals")
  @RequirePermission("admin.auctions.read")
  async finalBidApprovals(): Promise<FinalBidApprovalsView> {
    return {
      contractVersion: 1,
      generatedAt: new Date().toISOString(),
      items: await this.operations.listFinalBidApprovals(new Date()),
    };
  }

  @Post("final-bid-approvals/:lotId/approve")
  @RequirePermission("admin.auctions.write")
  async approveFinalBid(
    @Param("lotId") lotId: string,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
    @Headers("x-pioneer-test-account-id") actorAccountId: string | undefined,
  ): Promise<FinalBidDecisionResult> {
    const decidedAt = new Date();
    const decision = await this.operations.approveFinalBid(lotId);
    const auditId = await this.audit.record({
      action: "admin.final_bid.approve",
      actorAccountId: actorAccountId ?? null,
      correlationId,
      metadata: {
        auctionId: decision.auctionId,
        hammerPriceFils: decision.hammerPriceFils,
        sequence: decision.sequence,
      },
      subjectId: decision.lotId,
      subjectType: "lot",
    });

    return {
      auditId,
      contractVersion: 1,
      decidedAt: decidedAt.toISOString(),
      decision: "APPROVED",
      hammerPrice: toMoney(decision.hammerPriceFils),
      lotId: decision.lotId,
      sequence: decision.sequence,
    };
  }

  @Post("final-bid-approvals/:lotId/reject")
  @RequirePermission("admin.auctions.write")
  async rejectFinalBid(
    @Param("lotId") lotId: string,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
    @Headers("x-pioneer-test-account-id") actorAccountId: string | undefined,
  ): Promise<FinalBidDecisionResult> {
    const input = parseRejectFinalBidInput(body);
    const decidedAt = new Date();
    const decision = await this.operations.rejectFinalBid(lotId);
    const auditId = await this.audit.record({
      action: "admin.final_bid.reject",
      actorAccountId: actorAccountId ?? null,
      correlationId,
      metadata: {
        auctionId: decision.auctionId,
        hammerPriceFils: decision.hammerPriceFils,
        note: input.note,
        sequence: decision.sequence,
      },
      reasonCode: input.reasonCode,
      subjectId: decision.lotId,
      subjectType: "lot",
    });

    return {
      auditId,
      contractVersion: 1,
      decidedAt: decidedAt.toISOString(),
      decision: "REJECTED",
      hammerPrice: toMoney(decision.hammerPriceFils),
      lotId: decision.lotId,
      sequence: decision.sequence,
    };
  }
}
