export interface StartKycSessionInput {
  readonly accountId: string;
}

export interface StartKycSessionResult {
  readonly sessionId: string;
  readonly status: "INITIATED" | "PENDING";
}

export interface SubmitKycInput {
  readonly accountId: string;
  readonly emiratesIdNumber: string;
  readonly fullNameEn: string;
  readonly fullNameAr?: string | undefined;
  readonly nationality: string;
  readonly dateOfBirth: string;
  readonly expiryDate: string;
  readonly cardFrontRef: string;
  readonly cardBackRef: string;
  readonly selfieRef?: string | undefined;
}

export type KycProviderStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "UNAVAILABLE";

export interface SubmitKycResult {
  readonly status: KycProviderStatus;
  readonly providerSessionId: string;
  readonly rejectionReason?: string | undefined;
}

export interface KycProvider {
  startSession(input: StartKycSessionInput): Promise<StartKycSessionResult>;
  submit(input: SubmitKycInput): Promise<SubmitKycResult>;
  getStatus(providerSessionId: string): Promise<KycProviderStatus>;
}

export const KYC_PROVIDER = Symbol("KYC_PROVIDER");
