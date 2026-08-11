import { Inject, Injectable } from "@nestjs/common";

import { DatabasePool } from "../database/database.pool.js";

export interface RecordAuditEventInput {
  readonly actorAccountId: string | null;
  readonly action: string;
  readonly subjectType: string;
  readonly subjectId: string | null;
  readonly reasonCode?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly correlationId: string;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async record(input: RecordAuditEventInput): Promise<string> {
    const result = await this.database.query<{ id: string }>(
      `
        INSERT INTO audit_events (
          actor_account_id,
          action,
          subject_type,
          subject_id,
          reason_code,
          metadata,
          correlation_id
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        RETURNING id::text
      `,
      [
        input.actorAccountId,
        input.action,
        input.subjectType,
        input.subjectId,
        input.reasonCode ?? null,
        JSON.stringify(input.metadata ?? {}),
        input.correlationId,
      ],
    );

    const id = result.rows[0]?.id;
    if (id === undefined) {
      throw new Error("Audit insert did not return an id");
    }
    return id;
  }
}
