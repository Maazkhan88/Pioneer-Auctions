import { Controller, Get, Inject, UseGuards } from "@nestjs/common";

import { AdminPermissionGuard } from "../identity/admin-permission.guard.js";
import { RequirePermission } from "../identity/permission.decorator.js";
import {
  type AdminDashboardView,
  type FinalBidApprovalsView,
} from "./admin-operations.dto.js";
import { AdminOperationsRepository } from "./admin-operations.repository.js";

@Controller("/api/v1/admin")
@UseGuards(AdminPermissionGuard)
export class AdminOperationsController {
  constructor(
    @Inject(AdminOperationsRepository)
    private readonly operations: AdminOperationsRepository,
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

  @Get("final-bid-approvals")
  @RequirePermission("admin.auctions.read")
  async finalBidApprovals(): Promise<FinalBidApprovalsView> {
    return {
      contractVersion: 1,
      generatedAt: new Date().toISOString(),
      items: await this.operations.listFinalBidApprovals(new Date()),
    };
  }
}
