import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { KycStatus } from "@pioneer/contracts";

import { DatabasePool } from "../database/database.pool.js";
import { KYC_PROVIDER, type KycProvider } from "./kyc-provider.interface.js";
import type { SubmitKycPayload } from "./kyc.dto.js";

export interface KycVerificationResult {
  readonly status: KycStatus;
  readonly bidderNumber?: string | undefined;
  readonly verifiedAt?: string | undefined;
}

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
    @Inject(KYC_PROVIDER)
    private readonly kycProvider: KycProvider,
  ) {}

  async getKycStatus(
    accountId: string,
  ): Promise<{ status: KycStatus; bidderNumber?: string }> {
    try {
      const result = await this.database.query<{
        kyc_status: string;
        status: string;
        display_name: string;
      }>(
        `SELECT kyc_status, status, display_name FROM accounts WHERE id = $1`,
        [accountId],
      );

      const row = result.rows[0];
      if (!row) {
        return { status: "UNVERIFIED" };
      }

      const dbKycStatus = row.kyc_status;
      if (dbKycStatus === "VERIFIED") {
        return {
          bidderNumber: `Paddle #${accountId.slice(-4)}`,
          status: "VERIFIED",
        };
      } else if (dbKycStatus === "PENDING") {
        return { status: "PENDING" };
      } else if (dbKycStatus === "REJECTED" || dbKycStatus === "EXPIRED") {
        return { status: "REJECTED" };
      }

      return { status: "UNVERIFIED" };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve KYC status for accountId=${accountId}: ${error}`,
      );
      // Fail closed: database failure must NEVER return VERIFIED
      throw new ServiceUnavailableException({
        code: "PROVIDER_UNAVAILABLE",
        message: "Unable to retrieve KYC status at this time",
        retryable: true,
      });
    }
  }

  async startSession(accountId: string): Promise<{
    sessionId: string;
    status: string;
    accountId: string;
  }> {
    try {
      const session = await this.kycProvider.startSession({ accountId });
      return {
        accountId,
        sessionId: session.sessionId,
        status: session.status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to start KYC session for accountId=${accountId}: ${error}`,
      );
      throw new ServiceUnavailableException({
        code: "PROVIDER_UNAVAILABLE",
        message: "KYC provider is currently unavailable",
        retryable: true,
      });
    }
  }

  async submitVerification(
    accountId: string,
    payload: SubmitKycPayload,
  ): Promise<KycVerificationResult> {
    // Redact sensitive values from logs: no full Emirates ID, no full name, no images
    this.logger.log(
      `Received KYC submission for account=${accountId} nationality=${payload.nationality}`,
    );

    let providerResult;
    try {
      providerResult = await this.kycProvider.submit({
        accountId,
        ...payload,
      });
    } catch (error) {
      this.logger.error(
        `KYC provider submission failed for accountId=${accountId}: ${error}`,
      );
      throw new ServiceUnavailableException({
        code: "PROVIDER_UNAVAILABLE",
        message: "KYC provider is temporarily unavailable",
        retryable: true,
      });
    }

    if (providerResult.status === "UNAVAILABLE") {
      throw new ServiceUnavailableException({
        code: "PROVIDER_UNAVAILABLE",
        message: "KYC provider unavailable",
        retryable: true,
      });
    }

    // Normal submissions transition to PENDING unless provider returned VERIFIED or REJECTED
    const targetStatus: KycStatus =
      providerResult.status === "VERIFIED"
        ? "VERIFIED"
        : providerResult.status === "REJECTED"
          ? "REJECTED"
          : "PENDING";

    // Read and write accounts.kyc_status; do NOT alter accounts.status (general account status)
    // Fail closed: do NOT swallow persistence errors
    try {
      const dbResult = await this.database.query(
        `UPDATE accounts SET kyc_status = $1, updated_at = now() WHERE id = $2 RETURNING id`,
        [targetStatus, accountId],
      );
      if (dbResult.rowCount === 0) {
        throw new Error(`Account not found for id=${accountId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to persist KYC verification for accountId=${accountId}: ${error}`,
      );
      throw new ServiceUnavailableException({
        code: "PROVIDER_UNAVAILABLE",
        message: "Failed to persist KYC verification status",
        retryable: true,
      });
    }

    return {
      bidderNumber:
        targetStatus === "VERIFIED"
          ? `Paddle #${accountId.slice(-4)}`
          : undefined,
      status: targetStatus,
      verifiedAt:
        targetStatus === "VERIFIED" ? new Date().toISOString() : undefined,
    };
  }
}
