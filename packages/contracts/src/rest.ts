export type RestMethod = "delete" | "get" | "patch" | "post" | "put";

export interface RestOperation {
  readonly method: RestMethod;
  readonly path: string;
  readonly summary: string;
  readonly status: "contracted" | "planned";
}

export const restOperations = [
  operation("post", "/auth/uae-pass/start", "Start UAE PASS authorization"),
  operation("get", "/auth/uae-pass/callback", "Handle UAE PASS callback"),
  operation("post", "/auth/otp/request", "Request fallback OTP"),
  operation("post", "/auth/otp/verify", "Verify fallback OTP"),
  operation("post", "/auth/refresh", "Rotate refresh session"),
  operation("post", "/auth/logout", "Revoke current refresh session"),
  operation("get", "/me", "Get current profile"),
  operation("patch", "/me/preferences", "Update profile preferences"),
  operation("get", "/me/kyc", "Get KYC status"),
  operation("post", "/me/kyc/sessions", "Start fallback KYC session"),
  operation("get", "/categories", "List localized categories"),
  operation("get", "/auctions", "List auctions"),
  operation("get", "/auctions/{auctionId}", "Get auction"),
  operation("get", "/auctions/{auctionId}/lots", "List auction lots"),
  operation("get", "/lots", "Search lots", "contracted"),
  operation("get", "/lots/{lotId}", "Get lot details", "contracted"),
  operation("get", "/lots/{lotId}/bids", "Get public bid history"),
  operation(
    "get",
    "/lots/{lotId}/snapshot",
    "Get authoritative lot snapshot",
    "contracted",
  ),
  operation("post", "/lots/{lotId}/watch", "Watch lot"),
  operation("delete", "/lots/{lotId}/watch", "Unwatch lot"),
  operation("post", "/lots/{lotId}/terms-acceptances", "Accept lot terms"),
  operation("get", "/me/eligibility", "Explain bidding eligibility"),
  operation("get", "/me/deposits", "List deposit balances and holds"),
  operation("get", "/me/transactions", "List account transactions"),
  operation(
    "post",
    "/deposit-payment-intents",
    "Create deposit payment intent",
  ),
  operation(
    "get",
    "/deposit-payment-intents/{id}",
    "Get deposit payment intent",
  ),
  operation("post", "/deposit-refund-requests", "Request deposit refund"),
  operation("get", "/me/invoices", "List invoices and receipts"),
  operation("post", "/lots/{lotId}/bids", "Place bid", "contracted"),
  operation(
    "put",
    "/lots/{lotId}/proxy-bid",
    "Set proxy maximum",
    "contracted",
  ),
  operation(
    "get",
    "/lots/{lotId}/my-proxy-bid",
    "Get private proxy status",
    "contracted",
  ),
  operation(
    "delete",
    "/lots/{lotId}/proxy-bid",
    "Cancel proxy maximum",
    "contracted",
  ),
  operation("post", "/lots/{lotId}/offers", "Submit offer"),
  operation("get", "/me/bids", "List bidding activity"),
  operation("get", "/me/offers", "List offers"),
  operation("get", "/me/watchlist", "List watched lots"),
  operation("get", "/me/notifications", "List notifications"),
  operation("post", "/seller/listings", "Create seller listing draft"),
  operation("patch", "/seller/listings/{id}", "Update seller listing draft"),
  operation(
    "post",
    "/seller/listings/{id}/media",
    "Create listing media upload",
  ),
  operation(
    "post",
    "/seller/listings/{id}/submit",
    "Submit listing for review",
  ),
  operation("get", "/seller/listings", "List seller listings"),
  operation("get", "/seller/sales", "List seller sales"),
  operation("get", "/admin/dashboard", "Get admin dashboard", "contracted"),
  operation("get", "/admin/lots", "List admin lots"),
  operation("post", "/admin/lots", "Create admin lot"),
  operation("patch", "/admin/lots/{id}", "Update admin lot"),
  operation("get", "/admin/auctions", "List admin auctions"),
  operation("post", "/admin/auctions", "Create admin auction"),
  operation("patch", "/admin/auctions/{id}", "Update admin auction"),
  operation("post", "/admin/auctions/{id}/pause", "Pause auction"),
  operation("post", "/admin/auctions/{id}/resume", "Resume auction"),
  operation("post", "/admin/auctions/{id}/cancel", "Cancel auction"),
  operation("get", "/admin/final-bid-approvals", "List final-bid approvals"),
  operation(
    "post",
    "/admin/final-bid-approvals/{id}/approve",
    "Approve final bid",
  ),
  operation(
    "post",
    "/admin/final-bid-approvals/{id}/reject",
    "Reject final bid",
  ),
  operation("get", "/admin/offer-decisions", "List offer decisions"),
  operation("post", "/admin/offer-decisions/{id}", "Decide offer"),
  operation("get", "/admin/consignment-reviews", "List consignment reviews"),
  operation(
    "post",
    "/admin/consignment-reviews/{id}",
    "Decide consignment review",
  ),
  operation("get", "/admin/deposit-actions", "List deposit actions"),
  operation("post", "/admin/deposit-actions/{id}", "Apply deposit action"),
  operation("get", "/admin/audit-events", "List immutable audit events"),
] as const satisfies readonly RestOperation[];

function operation(
  method: RestMethod,
  path: string,
  summary: string,
  status: RestOperation["status"] = "planned",
): RestOperation {
  return { method, path, status, summary };
}
