# 20 — Open Questions (Requires Business Confirmation)

Status: consolidated from every "UNKNOWN — REQUIRES BUSINESS CONFIRMATION" flagged across the preceding 19 documents. Organized by topic. Each links back to its source for full context.

## Infrastructure / provenance

1. Which of the four files in `Revoked Key.zip` (APNs key, `pioneertest.jks`, `debug.keystore`, `upload_certificate.pem`) are actually rotated/inert vs. still live in production signing/push pipelines? [02](02-repository-inventory.md) §5, [18](18-security-review.md) SEC-003.
2. Is `deploy.php` (unauthenticated `git pull` trigger) actually deployed to the production web root, or was it only ever used locally/behind a VPN? [18](18-security-review.md) SEC-001.
3. What is the actual production database engine/version? (`database.php` absent from this export.) [02](02-repository-inventory.md).
4. What is the actual production PHP version? (Relevant because of the removed-in-PHP-7.2 `mcrypt_*` extension usage found in two files.) [18](18-security-review.md) SEC-026.
5. How is `cronjob::auto_sale_auction_items()` actually triggered on a schedule in production? No crontab/scheduler config exists in this repository export. [14](14-background-jobs.md).
6. Which backend domain does this codebase snapshot actually correspond to? The mobile app is compiled against `pas3.mindzbase.com`, while `pioneerauctions.ae` (commented out in the same config file) looks like the real production domain. [18](18-security-review.md) SEC-028.
7. Are `application/modules/api` and `application/modules/apis` actually reachable in production, or blocked at the web-server/reverse-proxy level in a way not visible from source? [18](18-security-review.md) SEC-002.

## Business rules requiring confirmation

8. Is live-hall reserve enforcement (100% operator discretion, no automatic check) an intentional business design, or a gap that should mirror the online-auction automatic reserve check? [06](06-bidding-engine.md) §3, [16](16-edge-cases.md) EC-07.
9. Is the absence of anti-sniping/bid-triggered time-extension logic intentional? [06](06-bidding-engine.md) §5.
10. What is the tie-break rule (if any) when two proxy/auto-bidders share the exact same `bid_limit`? [06](06-bidding-engine.md) §2, [16](16-edge-cases.md) EC-05.
11. Is deposit eligibility actually enforced server-side at bid-acceptance time, or only surfaced as a UI prompt (`get_ai_list`)? [03](03-business-domain.md) §5.
12. Does a formal item-approval workflow exist anywhere outside the modules reviewed, or is "staff curates which items go into an auction" really the only approval gate? [03](03-business-domain.md) §6.
13. Is there a minimum-image-count requirement for listing an item? No such server-side rule was found. [03](03-business-domain.md) §9.
14. What happens when a winning bidder refuses/fails to complete payment post-win? The follow-up workflow (reminder, penalty, re-listing, deposit forfeiture) wasn't located in the modules reviewed. [16](16-edge-cases.md) EC-13.
15. Is there a formal "withdrawn" lot status? No such value was confirmed among the `sold_status` values found. [16](16-edge-cases.md) EC-14.
16. Does a formal "auction archived/completed" terminal status exist beyond the single `'active'` literal confirmed in code? [05](05-auction-lifecycle.md).

## Feature scope / parity

17. Does the website expose live-hall customer bidding through the same `getapi::place_bid_live` endpoint, or via a separate server-rendered form-post path (which would be a fourth independent bid-submission implementation)? [08](08-website.md).
18. Is social login available on the website (not just mobile)? Not conclusively confirmed either way. [08](08-website.md).
19. Is the wishlist/favorites feature available on the website, or mobile-only? [08](08-website.md).
20. Is the vehicle valuation calculator mobile-accessible at all? No matching mobile screen was found. [08](08-website.md).
21. Are the two chatbot services (`pa-chatbot-admin-samin`, `pioneer-chatbot-webhook-webhook`) still actively used/maintained by the business, or a parked side project? Confirmed architecturally disconnected from the main platform (separate DB, domain, auth). [13](13-integrations.md).
22. What is the actual scope/purpose of the `accounts` and `sales` back-office modules beyond their names? Not independently deep-dived. [09](09-admin-platform.md).
23. Is the `login` module's admin-login implementation (a third, independent path alongside `user::login()`) still reachable/used in production, or fully superseded? [09](09-admin-platform.md), [04](04-users-and-permissions.md) §9.
24. Is the `jobcard` staff task/job-card feature still actively used? Its login flow has an internal inconsistency (references a seemingly-unpopulated `jobcard_users` table in one place). [09](09-admin-platform.md).
25. Are `payments`/`orders`/`order_items`/`adjustment_items` tables (referenced but never inserted into anywhere found) genuinely dead leftover e-commerce-template boilerplate, or populated by an external process not present in this export? [11](11-database-model.md) #Financial.

## Data / schema confirmation

26. What are the actual column types for all monetary fields (`bid.bid_amount`, `sold_items.price`/`payable_amount`, `transaction.amount`, `seller_charges.commission`)? Only one (`users.buyer_commission`) is confirmed `double` from the one real migration; everything else is inferred from usage only. [11](11-database-model.md) #4.
27. A full `SHOW CREATE TABLE` (or equivalent) export against the live database is needed to convert the entire [11-database-model.md](11-database-model.md) document from high-confidence inference to verified fact — every table/column/enum-value claim in it was reconstructed from code usage, not a schema definition.

## Suggested next step

Given the volume and severity of confirmed findings (see [18-security-review.md](18-security-review.md) and [19-technical-debt.md](19-technical-debt.md)), the highest-value next actions before any rebuild design work are: (a) get direct, read-only access to the production database to resolve the schema questions above, (b) get a business-side answer on which of these systems (chatbot services, `jobcard`, `accounts`/`sales` modules, `login` module) are still actually in active use, and (c) treat SEC-012 (`token_update` account takeover) as an live incident requiring immediate attention regardless of rebuild timeline, since it is exploitable today against the running production system if reachable.
