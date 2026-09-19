import { Injectable } from "@nestjs/common";

export interface LatencyPercentiles {
  readonly p50: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
  readonly totalSamples: number;
}

@Injectable()
export class MetricsService {
  private activeSockets = 0;
  private readonly bidCommands = new Map<string, number>();
  private readonly bidDurations: number[] = [];
  private softCloseExtensions = 0;
  private outboxLag = 0;
  private dbPoolActive = 0;
  private dbPoolIdle = 10;
  private readonly notifications = new Map<string, number>();
  private readonly paymentWebhooks = new Map<string, number>();
  private readonly kycVerifications = new Map<string, number>();
  private readonly httpRequests = new Map<string, number>();

  // Histograms buckets for bid latency (ms)
  private readonly durationBuckets = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

  // Socket Tracking
  recordSocketConnect(): void {
    this.activeSockets++;
  }

  recordSocketDisconnect(): void {
    if (this.activeSockets > 0) {
      this.activeSockets--;
    }
  }

  setActiveSockets(count: number): void {
    this.activeSockets = Math.max(0, count);
  }

  getActiveSockets(): number {
    return this.activeSockets;
  }

  // Bid Metrics
  recordBidCommand(status: "ACCEPTED" | "REJECTED", durationMs: number, reason = "NONE"): void {
    const key = `status="${status}",reason="${reason}"`;
    this.bidCommands.set(key, (this.bidCommands.get(key) ?? 0) + 1);

    this.bidDurations.push(durationMs);
    // Retain bounded sample window for percentiles
    if (this.bidDurations.length > 5000) {
      this.bidDurations.splice(0, 1000);
    }
  }

  recordSoftCloseExtension(): void {
    this.softCloseExtensions++;
  }

  getSoftCloseExtensions(): number {
    return this.softCloseExtensions;
  }

  getBidPercentiles(): LatencyPercentiles {
    if (this.bidDurations.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0, totalSamples: 0 };
    }

    const sorted = [...this.bidDurations].sort((a, b) => a - b);
    const getP = (p: number) => {
      const idx = Math.min(
        Math.floor(sorted.length * p),
        sorted.length - 1,
      );
      return sorted[idx]!;
    };

    return {
      p50: getP(0.5),
      p90: getP(0.9),
      p95: getP(0.95),
      p99: getP(0.99),
      totalSamples: sorted.length,
    };
  }

  // Outbox & DB Pool Gauges
  setOutboxLag(lag: number): void {
    this.outboxLag = Math.max(0, lag);
  }

  getOutboxLag(): number {
    return this.outboxLag;
  }

  setDbPoolStats(active: number, idle: number): void {
    this.dbPoolActive = Math.max(0, active);
    this.dbPoolIdle = Math.max(0, idle);
  }

  // Notifications
  recordNotification(channel: "PUSH" | "EMAIL" | "SMS", status: "SUCCESS" | "FAILED"): void {
    const key = `channel="${channel}",status="${status}"`;
    this.notifications.set(key, (this.notifications.get(key) ?? 0) + 1);
  }

  // Payments
  recordPaymentWebhook(status: "SUCCESS" | "REJECTED" | "FAILED"): void {
    const key = `status="${status}"`;
    this.paymentWebhooks.set(key, (this.paymentWebhooks.get(key) ?? 0) + 1);
  }

  // KYC
  recordKycVerification(status: "VERIFIED" | "REJECTED" | "PENDING"): void {
    const key = `status="${status}"`;
    this.kycVerifications.set(key, (this.kycVerifications.get(key) ?? 0) + 1);
  }

  // HTTP Requests
  recordHttpRequest(method: string, route: string, statusCode: number): void {
    const key = `method="${method}",route="${route}",status="${statusCode}"`;
    this.httpRequests.set(key, (this.httpRequests.get(key) ?? 0) + 1);
  }

  // Reset (for tests)
  reset(): void {
    this.activeSockets = 0;
    this.bidCommands.clear();
    this.bidDurations.length = 0;
    this.softCloseExtensions = 0;
    this.outboxLag = 0;
    this.dbPoolActive = 0;
    this.dbPoolIdle = 10;
    this.notifications.clear();
    this.paymentWebhooks.clear();
    this.kycVerifications.clear();
    this.httpRequests.clear();
  }

  // Export Prometheus Text Format (RFC 0004)
  toPrometheusText(): string {
    const lines: string[] = [];

    // Active sockets
    lines.push("# HELP pioneer_active_sockets Number of connected bidding websockets");
    lines.push("# TYPE pioneer_active_sockets gauge");
    lines.push(`pioneer_active_sockets ${this.activeSockets}`);

    // Bid commands total
    lines.push("# HELP pioneer_bid_commands_total Total bid commands processed");
    lines.push("# TYPE pioneer_bid_commands_total counter");
    if (this.bidCommands.size === 0) {
      lines.push('pioneer_bid_commands_total{status="ACCEPTED",reason="NONE"} 0');
    } else {
      for (const [labels, count] of this.bidCommands.entries()) {
        lines.push(`pioneer_bid_commands_total{${labels}} ${count}`);
      }
    }

    // Bid latency summary & histogram
    lines.push("# HELP pioneer_bid_duration_ms Bidding command execution duration in milliseconds");
    lines.push("# TYPE pioneer_bid_duration_ms histogram");
    const count = this.bidDurations.length;
    const sum = this.bidDurations.reduce((acc, v) => acc + v, 0);

    for (const le of this.durationBuckets) {
      const bucketCount = this.bidDurations.filter((d) => d <= le).length;
      lines.push(`pioneer_bid_duration_ms_bucket{le="${le}"} ${bucketCount}`);
    }
    lines.push(`pioneer_bid_duration_ms_bucket{le="+Inf"} ${count}`);
    lines.push(`pioneer_bid_duration_ms_sum ${sum}`);
    lines.push(`pioneer_bid_duration_ms_count ${count}`);

    // Percentiles gauge
    const percentiles = this.getBidPercentiles();
    lines.push("# HELP pioneer_bid_duration_ms_p50 50th percentile bid latency in ms");
    lines.push("# TYPE pioneer_bid_duration_ms_p50 gauge");
    lines.push(`pioneer_bid_duration_ms_p50 ${percentiles.p50}`);
    lines.push("# HELP pioneer_bid_duration_ms_p95 95th percentile bid latency in ms");
    lines.push("# TYPE pioneer_bid_duration_ms_p95 gauge");
    lines.push(`pioneer_bid_duration_ms_p95 ${percentiles.p95}`);
    lines.push("# HELP pioneer_bid_duration_ms_p99 99th percentile bid latency in ms");
    lines.push("# TYPE pioneer_bid_duration_ms_p99 gauge");
    lines.push(`pioneer_bid_duration_ms_p99 ${percentiles.p99}`);

    // Soft close extensions
    lines.push("# HELP pioneer_soft_close_extensions_total Total soft close extensions triggered");
    lines.push("# TYPE pioneer_soft_close_extensions_total counter");
    lines.push(`pioneer_soft_close_extensions_total ${this.softCloseExtensions}`);

    // Outbox lag
    lines.push("# HELP pioneer_outbox_lag Number of unpublished events in the outbox");
    lines.push("# TYPE pioneer_outbox_lag gauge");
    lines.push(`pioneer_outbox_lag ${this.outboxLag}`);

    // DB pool
    lines.push("# HELP pioneer_db_pool_active Active PostgreSQL client connections");
    lines.push("# TYPE pioneer_db_pool_active gauge");
    lines.push(`pioneer_db_pool_active ${this.dbPoolActive}`);
    lines.push("# HELP pioneer_db_pool_idle Idle PostgreSQL client connections");
    lines.push("# TYPE pioneer_db_pool_idle gauge");
    lines.push(`pioneer_db_pool_idle ${this.dbPoolIdle}`);

    // Notifications
    lines.push("# HELP pioneer_notifications_total Notifications delivered by channel and status");
    lines.push("# TYPE pioneer_notifications_total counter");
    if (this.notifications.size === 0) {
      lines.push('pioneer_notifications_total{channel="PUSH",status="SUCCESS"} 0');
    } else {
      for (const [labels, val] of this.notifications.entries()) {
        lines.push(`pioneer_notifications_total{${labels}} ${val}`);
      }
    }

    // Payment webhooks
    lines.push("# HELP pioneer_payment_webhooks_total Processed payment webhooks");
    lines.push("# TYPE pioneer_payment_webhooks_total counter");
    if (this.paymentWebhooks.size === 0) {
      lines.push('pioneer_payment_webhooks_total{status="SUCCESS"} 0');
    } else {
      for (const [labels, val] of this.paymentWebhooks.entries()) {
        lines.push(`pioneer_payment_webhooks_total{${labels}} ${val}`);
      }
    }

    // KYC verifications
    lines.push("# HELP pioneer_kyc_verifications_total KYC submission outcomes");
    lines.push("# TYPE pioneer_kyc_verifications_total counter");
    if (this.kycVerifications.size === 0) {
      lines.push('pioneer_kyc_verifications_total{status="VERIFIED"} 0');
    } else {
      for (const [labels, val] of this.kycVerifications.entries()) {
        lines.push(`pioneer_kyc_verifications_total{${labels}} ${val}`);
      }
    }

    // HTTP Requests
    lines.push("# HELP pioneer_http_requests_total Total HTTP requests handled");
    lines.push("# TYPE pioneer_http_requests_total counter");
    for (const [labels, val] of this.httpRequests.entries()) {
      lines.push(`pioneer_http_requests_total{${labels}} ${val}`);
    }

    return lines.join("\n") + "\n";
  }
}
