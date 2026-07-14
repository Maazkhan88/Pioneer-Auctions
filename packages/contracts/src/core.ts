export const CONTRACT_VERSION = 1 as const;

export type ContractVersion = typeof CONTRACT_VERSION;
export type Currency = "AED";
export type IsoDateTime = string;
export type Uuid = string;

export interface Money {
  readonly currency: Currency;
  readonly amountFils: number;
}

export type ErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_FORBIDDEN"
  | "ACCOUNT_RESTRICTED"
  | "KYC_REQUIRED"
  | "KYC_PENDING"
  | "DEPOSIT_REQUIRED"
  | "DEPOSIT_INSUFFICIENT"
  | "TERMS_ACCEPTANCE_REQUIRED"
  | "AUCTION_NOT_LIVE"
  | "AUCTION_PAUSED"
  | "AUCTION_CLOSED"
  | "LOT_NOT_FOUND"
  | "LOT_NOT_BIDDABLE"
  | "BID_TOO_LOW"
  | "BID_AMOUNT_INVALID"
  | "PROXY_MAX_TOO_LOW"
  | "OFFER_NOT_ALLOWED"
  | "COMMAND_CONFLICT"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "VALIDATION_FAILED"
  | "INTERNAL_ERROR";

export interface CommandMeta {
  readonly contractVersion: ContractVersion;
  readonly commandId: Uuid;
  readonly sentAt: IsoDateTime;
}

export interface CommandError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
}

export type CommandAck<TResult, TLatest = never> =
  | {
      readonly contractVersion: ContractVersion;
      readonly commandId: Uuid;
      readonly status: "ACCEPTED";
      readonly correlationId: string;
      readonly serverTime: IsoDateTime;
      readonly result: TResult;
    }
  | {
      readonly contractVersion: ContractVersion;
      readonly commandId: Uuid;
      readonly status: "REJECTED";
      readonly correlationId: string;
      readonly serverTime: IsoDateTime;
      readonly error: CommandError;
      readonly latest?: TLatest;
    };
