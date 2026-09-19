# Operational Runbook 07 — Notification Provider Outage & Fallback SOP

**Severity:** P2 (High User Noise) -> P1 (if Outbid notifications delayed > 60s during active closing)  
**Owners:** Notification Service Owner, On-Call SRE  
**User Impact:** Push notifications, SMS, or Emails may be delayed; In-App notification center and WebSocket live bid indicators remain authoritative and immediate.

---

## 1. Architectural Guardrail

> **Decoupling Invariant:**  
> The real-time bidding loop **never blocks** on push notifications, emails, or SMS.
> When a bid is accepted, the atomic transaction commits immediately. The `BiddingOutboxPublisher` pushes real-time WebSocket state to active screens in `< 50ms`. Notifications are handled asynchronously by worker queues.

---

## 2. Detection & Alerts

| Alert Name | Condition | Severity | Impact |
| :--- | :--- | :--- | :--- |
| `PushProviderErrorRate` | > 10% FCM/APNs failures over 5m | P2 | Push alerts dropped; fallback to In-App |
| `EmailQueueLag` | Queue age > 15m for emails | P3 | Outbid/Confirmation emails delayed |
| `SmsDeliveryFailure` | > 5% SMS OTP / critical alert failures | P1 | Bidders cannot complete 2FA or KYC |

Check current delivery stats via Prometheus:
```bash
curl -s http://localhost:3000/metrics | grep pioneer_notifications_total
```

---

## 3. Diagnostic & Triage Procedures

### Step 3.1: Check Provider Health
- **FCM Status:** Check Google Cloud Service Health Dashboard.
- **APNs Status:** Check Apple System Status for APNs.
- **SMS Gateway:** Inspect Twilio / Unifonic status dashboard.

### Step 3.2: Inspect Application Error Logs
```bash
docker compose -f infra/local/compose.yml logs -n 100 api | grep -E "(PushProvider|EmailProvider|SmsProvider)"
```

---

## 4. Mitigation Actions

### Step 4.1: Switch to In-App Only Notification Mode
If external push providers are down, configure the notification routing engine to suppress failing external retries and route alerts exclusively through the In-App notification center (`IN_APP` channel):
```bash
curl -X POST http://localhost:3000/api/v1/admin/notifications/routing-mode \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "suppressChannels": ["PUSH"],
    "forceInApp": true,
    "rationale": "External FCM provider degradation"
  }'
```

### Step 4.2: Enable Live Banner Broadcast in Mobile App
Broadcast an emergency banner informing active mobile bidders to rely on the In-App Notification Center:
```bash
curl -X POST http://localhost:3000/api/v1/admin/broadcast-announcement \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "messageEn": "Push alerts currently delayed. Please keep your bidding screen open for real-time status.",
    "messageAr": "تنبيهات الإشعارات متأخرة حالياً. يرجى إبقاء شاشة المزايدة مفتوحة للمتابعة المباشرة."
  }'
```

### Step 4.3: Recovery & Queue Drainage
Once the provider recovers:
1. Re-enable normal routing mode.
2. Monitor delivery rate until queue lag drops to zero.
3. Discard stale outbid notifications older than 30 minutes to prevent user confusion.
