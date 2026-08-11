import { Pool } from "pg";

import { readEnvironment } from "../config/environment.js";

const roles = [
  ["super_admin", "Full system administration"],
  ["operations", "Auction operations and lot management"],
  ["finance", "Deposit, payment, and invoice operations"],
  ["support", "Customer support read access"],
] as const;

const permissions = [
  ["admin.auctions.read", "Read auction operations data"],
  ["admin.auctions.write", "Create and update auctions and lots"],
  ["admin.audit.read", "Read immutable audit events"],
  ["admin.finance.read", "Read finance and deposit queues"],
  ["admin.finance.write", "Record permitted finance actions"],
  ["admin.users.read", "Read user and KYC status"],
] as const;

const rolePermissions: Readonly<Record<string, readonly string[]>> = {
  finance: ["admin.finance.read", "admin.finance.write", "admin.users.read"],
  operations: [
    "admin.auctions.read",
    "admin.auctions.write",
    "admin.users.read",
  ],
  super_admin: permissions.map(([code]) => code),
  support: ["admin.auctions.read", "admin.users.read"],
};

const seedAccounts = [
  {
    displayName: "Pioneer Test Admin",
    email: "admin.test@pioneer.local",
    roles: ["super_admin"],
  },
  {
    displayName: "Pioneer Test Buyer",
    email: "buyer.test@pioneer.local",
    roles: [],
  },
] as const;

export async function seedDevelopmentData(
  databaseUrl = readEnvironment().databaseUrl,
): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [code, description] of roles) {
      await client.query(
        `
          INSERT INTO roles (code, description)
          VALUES ($1, $2)
          ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description
        `,
        [code, description],
      );
    }

    for (const [code, description] of permissions) {
      await client.query(
        `
          INSERT INTO permissions (code, description)
          VALUES ($1, $2)
          ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description
        `,
        [code, description],
      );
    }

    for (const [roleCode, permissionCodes] of Object.entries(rolePermissions)) {
      for (const permissionCode of permissionCodes) {
        await client.query(
          `
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT roles.id, permissions.id
            FROM roles, permissions
            WHERE roles.code = $1 AND permissions.code = $2
            ON CONFLICT DO NOTHING
          `,
          [roleCode, permissionCode],
        );
      }
    }

    for (const account of seedAccounts) {
      const accountResult = await client.query<{ id: string }>(
        `
          INSERT INTO accounts (email, display_name, status, kyc_status)
          VALUES ($1, $2, 'ACTIVE', 'VERIFIED')
          ON CONFLICT (email) DO UPDATE
          SET display_name = EXCLUDED.display_name,
              status = 'ACTIVE',
              kyc_status = 'VERIFIED',
              updated_at = now()
          RETURNING id::text
        `,
        [account.email, account.displayName],
      );
      const accountId = accountResult.rows[0]?.id;
      if (accountId === undefined) {
        throw new Error(`Unable to seed account ${account.email}`);
      }

      for (const roleCode of account.roles) {
        await client.query(
          `
            INSERT INTO account_roles (account_id, role_id)
            SELECT $1::uuid, roles.id
            FROM roles
            WHERE roles.code = $2
            ON CONFLICT DO NOTHING
          `,
          [accountId, roleCode],
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
