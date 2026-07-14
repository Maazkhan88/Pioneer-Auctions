# Product brief

## Vision

Pioneer Auctions becomes the UAE's most trusted, transparent, and responsive multi-category auction platform: browse freely, verify quickly, place a clearly explained refundable deposit, bid with sub-second certainty, and always understand what happens at close.

## Trust moments

The rebuild is judged most heavily at three moments:

1. Payment and deposit: no reinstall workaround, no ambiguous status, and a visible refund timeline.
2. Live bidding: authoritative confirmation, immediate outbid state, transparent proxy behavior, and equal soft-close rules.
3. Closing: reserve and approval status are explicit, the approval SLA is visible, and the hammer price cannot be renegotiated in-place.

## Product pillars

- Trust by transparency: reserve status, pseudonymized history, fee totals, deposit ledger, SLAs, and reasoned outcomes.
- Real-time certainty: server-authoritative bids, reconnect recovery, high-priority outbid events, and soft-close.
- Local first: English/Arabic parity, RTL, AED, UAE PASS, UAE payment rails, and counsel-reviewed compliance.
- Surface parity: Flutter and web deliver the same buyer capability.
- Two-sided marketplace: Pioneer inventory first, then moderated consumer consignments.

## MVP outcome

A real weekly auction runs end-to-end on web and mobile with:

- public browsing/search for cars plus one additional category;
- UAE PASS and fallback identity path;
- KYC and deposit eligibility at bid intent;
- lot media, documents, reserve state, fee estimate, terms, bid history, and countdown;
- manual/custom and proxy bidding with reconnect recovery;
- transparent soft-close and outbid/ending/ended notifications;
- admin lot/auction controls, deposit overview, and final-bid approval;
- English and Arabic, light and dark themes;
- durable bid/payment/audit records and operational monitoring.

MVP exit requires a controlled production-like test auction and the evidence in Task 012. Calendar, make-an-offer, full seller wizard, all categories, advanced reporting, campaigns, recommendations, hall livestream, and reputation are later increments unless explicitly pulled forward.

## Roles

- Guest: browse, search, inspect lots and public history.
- Bidder: verified user with terms/deposit eligibility; watch, bid, proxy bid, pay, and collect.
- Seller: create and track moderated consignments (v1 boundary).
- Moderator: catalog, auction, offer, and consignment operations.
- Finance: deposit, refund, invoice, settlement, and reconciliation operations.
- Super admin: tightly controlled configuration/role operations, not a bypass for ledgers.
- Support/auditor: least-privilege read views and case/audit context.

## Core business rules

- Browse before registration; gate identity, KYC, terms, and deposit at bid intent.
- Display the next valid bid and estimated all-in cost before confirmation.
- The server, never a client clock, determines whether a bid arrived before close.
- Proxy maximums remain private; only visible consequence bids enter public history.
- A qualifying late bid extends time under the disclosed policy for everyone.
- Reserve amount remains private unless Pioneer explicitly changes policy; reserve status is public.
- Closing approval is timed, reasoned, and audited. It confirms or rejects the hammer price but does not change it.
- Financial and bid corrections are append-only compensating records.

## Success measures

- Payment technical success above 99%, segmented separately from issuer/customer decline.
- Bid acknowledgement p95 below 500 ms under the agreed regional workload.
- Deposit/refund and final-approval SLA adherence.
- Registration → KYC → deposit → first-bid conversion and time to first bid.
- Live bidders, bids per lot, watch rate, view-to-bid conversion, and lot active time.
- Sell-through, reserve-met rate, GMV, premium/commission revenue, and payment completion.
- Repeat bidder/seller rate, app rating, support contacts per auction, and dispute rate.

## External critical path

Start UAE PASS and primary/secondary payment onboarding immediately. Code uses adapters and development fakes, but commercial assessment, sandbox access, security review, and go-live approval cannot be compressed by agent velocity.

## Evidence and caveats

- Reported current-product pain points and competitor reviews are research hypotheses until validated against Pioneer analytics, support records, and interviews.
- Fees, provider features, regulatory requirements, attributes, retention, and timelines require current primary-source/vendor/counsel confirmation.
- Delivery estimates depend more on review capacity, decision latency, content/data quality, and external approvals than code generation speed.
