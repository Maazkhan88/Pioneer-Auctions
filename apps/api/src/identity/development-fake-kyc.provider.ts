import { Injectable, InternalServerErrorException } from "@nestjs/common";

import {
  type KycProvider,
  type KycProviderStatus,
  type StartKycSessionInput,
  type StartKycSessionResult,
  type SubmitKycInput,
  type SubmitKycResult,
} from "./kyc-provider.interface.js";

@Injectable()
export class DevelopmentFakeKycProvider implements KycProvider {
  constructor() {
    if (process.env.NODE_ENV === "production") {
      throw new InternalServerErrorException(
        "DevelopmentFakeKycProvider must not be enabled under production configuration",
      );
    }
  }

  async startSession(input: StartKycSessionInput): Promise<StartKycSessionResult> {
    void input;
    if (process.env.NODE_ENV === "production") {
      throw new InternalServerErrorException(
        "DevelopmentFakeKycProvider must not be used in production",
      );
    }
    return {
      sessionId: `kyc-sess-dev-${Date.now()}`,
      status: "INITIATED",
    };
  }

  async submit(input: SubmitKycInput): Promise<SubmitKycResult> {
    void input;
    if (process.env.NODE_ENV === "production") {
      throw new InternalServerErrorException(
        "DevelopmentFakeKycProvider must not be used in production",
      );
    }
    // Submissions normally transition to PENDING. Only if explicitly configured does dev fake verify.
    const autoVerify = process.env.PIONEER_DEV_AUTO_VERIFY_KYC === "1";
    return {
      providerSessionId: `kyc-prov-${Date.now()}`,
      status: autoVerify ? "VERIFIED" : "PENDING",
    };
  }

  async getStatus(providerSessionId: string): Promise<KycProviderStatus> {
    void providerSessionId;
    if (process.env.NODE_ENV === "production") {
      throw new InternalServerErrorException(
        "DevelopmentFakeKycProvider must not be used in production",
      );
    }
    const autoVerify = process.env.PIONEER_DEV_AUTO_VERIFY_KYC === "1";
    return autoVerify ? "VERIFIED" : "PENDING";
  }
}
