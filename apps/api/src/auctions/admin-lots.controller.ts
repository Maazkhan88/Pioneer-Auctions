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
  parseBulkImportInput,
  parseCreateLotInput,
  parseUpdateLotInput,
  validateCreateLotRow,
} from "./lot.dto.js";
import type { AdminLotView, BulkImportResult } from "./lot.dto.js";
import { LotsRepository } from "./lots.repository.js";

@Controller("/api/v1/admin/lots")
@UseGuards(AdminPermissionGuard)
export class AdminLotsController {
  constructor(
    @Inject(LotsRepository)
    private readonly lots: LotsRepository,
    @Inject(AuditService)
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

  @Post("bulk-import")
  @RequirePermission("admin.auctions.write")
  async bulkImport(
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
    @Headers("x-pioneer-test-account-id") actorAccountId: string | undefined,
  ): Promise<BulkImportResult> {
    const { dryRun, rows } = parseBulkImportInput(body);
    const validated = rows.map((row, index) => ({
      index,
      ...validateCreateLotRow(row),
    }));
    const validCount = validated.filter((entry) => entry.ok).length;
    const allValid = validCount === validated.length;

    if (dryRun || !allValid) {
      return {
        committed: false,
        contractVersion: 1,
        results: validated.map((entry) =>
          entry.ok
            ? { index: entry.index, ok: true }
            : { errors: entry.errors, index: entry.index, ok: false },
        ),
        rowCount: rows.length,
        validCount,
      };
    }

    const inputs = validated.flatMap((entry) =>
      entry.ok ? [entry.input] : [],
    );
    const created = await this.lots.createMany(inputs);
    await this.audit.record({
      action: "admin.lots.bulk_import",
      actorAccountId: actorAccountId ?? null,
      correlationId,
      metadata: { rowCount: rows.length },
      subjectId: null,
      subjectType: "lot_bulk_import",
    });

    return {
      committed: true,
      contractVersion: 1,
      results: created.map((lot, index) => ({ index, lot, ok: true })),
      rowCount: rows.length,
      validCount: created.length,
    };
  }

  @Patch(":lotId")
  @RequirePermission("admin.auctions.write")
  async update(
    @Param("lotId") lotId: string,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
    @Headers("x-pioneer-test-account-id") actorAccountId: string | undefined,
  ): Promise<AdminLotView> {
    const input = parseUpdateLotInput(body);
    const updated = await this.lots.update(lotId, input);
    await this.audit.record({
      action: "admin.lots.update",
      actorAccountId: actorAccountId ?? null,
      correlationId,
      metadata: { fields: Object.keys(input) },
      subjectId: updated.id,
      subjectType: "lot",
    });
    return updated;
  }
}
