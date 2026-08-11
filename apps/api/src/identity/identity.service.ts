import { Inject, Injectable } from "@nestjs/common";

import { DatabasePool } from "../database/database.pool.js";

export type AccountStatus =
  "ACTIVE" | "PENDING_VERIFICATION" | "RESTRICTED" | "DISABLED";

export interface AccountSummary {
  readonly id: string;
  readonly displayName: string;
  readonly status: AccountStatus;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

interface AccountPermissionRow {
  readonly id: string;
  readonly display_name: string;
  readonly status: AccountStatus;
  readonly roles: readonly string[] | null;
  readonly permissions: readonly string[] | null;
}

@Injectable()
export class IdentityService {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async getAccountSummary(accountId: string): Promise<AccountSummary | null> {
    const result = await this.database.query<AccountPermissionRow>(
      `
        SELECT
          accounts.id::text,
          accounts.display_name,
          accounts.status,
          COALESCE(array_agg(DISTINCT roles.code) FILTER (WHERE roles.code IS NOT NULL), '{}') AS roles,
          COALESCE(array_agg(DISTINCT permissions.code) FILTER (WHERE permissions.code IS NOT NULL), '{}') AS permissions
        FROM accounts
        LEFT JOIN account_roles ON account_roles.account_id = accounts.id
        LEFT JOIN roles ON roles.id = account_roles.role_id
        LEFT JOIN role_permissions ON role_permissions.role_id = roles.id
        LEFT JOIN permissions ON permissions.id = role_permissions.permission_id
        WHERE accounts.id = $1
        GROUP BY accounts.id, accounts.display_name, accounts.status
      `,
      [accountId],
    );

    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }

    return {
      displayName: row.display_name,
      id: row.id,
      permissions: row.permissions ?? [],
      roles: row.roles ?? [],
      status: row.status,
    };
  }

  hasPermission(account: AccountSummary, permission: string): boolean {
    return (
      account.status === "ACTIVE" && account.permissions.includes(permission)
    );
  }
}
