import 'package:pioneer_contracts/pioneer_contracts.dart';

enum SequenceDecision {
  apply,
  stale,
  gap,
}

/// Classifies an incoming event's sequence against the last applied sequence.
/// Per docs/api-contracts.md §9:
/// - Equal or older sequence is 'stale' (duplicate delivery).
/// - Exactly lastAppliedSequence + 1 is 'apply'.
/// - Anything else (or when lastAppliedSequence is null) is 'gap'.
SequenceDecision classifySequence(int? lastAppliedSequence, int incomingSequence) {
  if (lastAppliedSequence == null) {
    return SequenceDecision.gap;
  }
  if (incomingSequence <= lastAppliedSequence) {
    return SequenceDecision.stale;
  }
  if (incomingSequence == lastAppliedSequence + 1) {
    return SequenceDecision.apply;
  }
  return SequenceDecision.gap;
}

/// Public lot state snapshot representation
class LotPublicState {
  final int bidCount;
  final String closesAt;
  final Money? currentBid;
  final String lifecycle;
  final Money nextMinimumBid;
  final String reserveStatus;

  const LotPublicState({
    required this.bidCount,
    required this.closesAt,
    this.currentBid,
    required this.lifecycle,
    required this.nextMinimumBid,
    required this.reserveStatus,
  });

  static LotPublicState? fromJson(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    try {
      final bidCount = raw['bidCount'] as int? ?? 0;
      final closesAt = raw['closesAt'] as String?;
      final lifecycle = raw['lifecycle'] as String?;
      final reserveStatus = raw['reserveStatus'] as String? ?? 'NOT_MET';
      if (closesAt == null || lifecycle == null) return null;

      final currentBidRaw = raw['currentBid'];
      Money? currentBid;
      if (currentBidRaw is Map<String, dynamic>) {
        currentBid = Money.fromJson(currentBidRaw);
      }

      final nextMinRaw = raw['nextMinimumBid'];
      if (nextMinRaw is! Map<String, dynamic>) return null;
      final nextMinimumBid = Money.fromJson(nextMinRaw);

      return LotPublicState(
        bidCount: bidCount,
        closesAt: closesAt,
        currentBid: currentBid,
        lifecycle: lifecycle,
        nextMinimumBid: nextMinimumBid,
        reserveStatus: reserveStatus,
      );
    } catch (_) {
      return null;
    }
  }
}

/// Emitted by server on connection handshake: 'server:hello'
class ServerHelloEvent {
  final DateTime serverTime;
  final String? connectionId;
  final int contractVersion;

  const ServerHelloEvent({
    required this.serverTime,
    this.connectionId,
    required this.contractVersion,
  });

  static ServerHelloEvent? fromJson(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    try {
      final timeStr = raw['serverTime'] as String?;
      if (timeStr == null) return null;
      final serverTime = DateTime.parse(timeStr);
      final connectionId = raw['connectionId'] as String?;
      final contractVersion = raw['contractVersion'] as int? ?? 1;

      return ServerHelloEvent(
        serverTime: serverTime,
        connectionId: connectionId,
        contractVersion: contractVersion,
      );
    } catch (_) {
      return null;
    }
  }
}

/// Emitted on subscription or sync: 'lot:snapshot'
class LotSnapshotEvent {
  final String auctionId;
  final String lotId;
  final int sequence;
  final LotPublicState state;

  const LotSnapshotEvent({
    required this.auctionId,
    required this.lotId,
    required this.sequence,
    required this.state,
  });

  static LotSnapshotEvent? fromJson(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    try {
      final auctionId = raw['auctionId'] as String?;
      final lotId = raw['lotId'] as String?;
      final sequence = raw['sequence'] as int?;
      final stateRaw = raw['state'];
      if (auctionId == null || lotId == null || sequence == null || stateRaw == null) {
        return null;
      }
      final state = LotPublicState.fromJson(stateRaw);
      if (state == null) return null;

      return LotSnapshotEvent(
        auctionId: auctionId,
        lotId: lotId,
        sequence: sequence,
        state: state,
      );
    } catch (_) {
      return null;
    }
  }
}

/// Emitted when a bid is accepted: 'bid:accepted' (flat shape per DEC-022)
class BidAcceptedEvent {
  final Money amount;
  final String auctionId;
  final String bidKind;
  final Money currentBid;
  final bool extended;
  final String lotId;
  final Money nextMinimumBid;
  final String reserveStatus;
  final int sequence;

  const BidAcceptedEvent({
    required this.amount,
    required this.auctionId,
    required this.bidKind,
    required this.currentBid,
    required this.extended,
    required this.lotId,
    required this.nextMinimumBid,
    required this.reserveStatus,
    required this.sequence,
  });

  static BidAcceptedEvent? fromJson(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    try {
      final lotId = raw['lotId'] as String?;
      final auctionId = raw['auctionId'] as String?;
      final sequence = raw['sequence'] as int?;
      final bidKind = raw['bidKind'] as String? ?? 'MANUAL';
      final extended = raw['extended'] as bool? ?? false;
      final reserveStatus = raw['reserveStatus'] as String? ?? 'MET';

      if (lotId == null || auctionId == null || sequence == null) return null;

      final amountRaw = raw['amount'];
      final currentBidRaw = raw['currentBid'];
      final nextMinRaw = raw['nextMinimumBid'];

      if (amountRaw is! Map<String, dynamic> ||
          currentBidRaw is! Map<String, dynamic> ||
          nextMinRaw is! Map<String, dynamic>) {
        return null;
      }

      return BidAcceptedEvent(
        amount: Money.fromJson(amountRaw),
        auctionId: auctionId,
        bidKind: bidKind,
        currentBid: Money.fromJson(currentBidRaw),
        extended: extended,
        lotId: lotId,
        nextMinimumBid: Money.fromJson(nextMinRaw),
        reserveStatus: reserveStatus,
        sequence: sequence,
      );
    } catch (_) {
      return null;
    }
  }
}

/// Emitted when soft-close triggers extension: 'auction:extended'
class AuctionExtendedEvent {
  final String auctionId;
  final String closesAt;
  final int extensionCount;
  final String lotId;
  final int sequence;

  const AuctionExtendedEvent({
    required this.auctionId,
    required this.closesAt,
    required this.extensionCount,
    required this.lotId,
    required this.sequence,
  });

  static AuctionExtendedEvent? fromJson(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    try {
      final auctionId = raw['auctionId'] as String?;
      final closesAt = raw['closesAt'] as String?;
      final extensionCount = raw['extensionCount'] as int? ?? 1;
      final lotId = raw['lotId'] as String?;
      final sequence = raw['sequence'] as int?;

      if (auctionId == null || closesAt == null || lotId == null || sequence == null) {
        return null;
      }

      return AuctionExtendedEvent(
        auctionId: auctionId,
        closesAt: closesAt,
        extensionCount: extensionCount,
        lotId: lotId,
        sequence: sequence,
      );
    } catch (_) {
      return null;
    }
  }
}

/// Emitted when auction lifecycle state changes: 'auction:state-changed'
class AuctionStateChangedEvent {
  final String auctionId;
  final String? closesAt;
  final String? startsAt;
  final String lifecycle;
  final String lotId;
  final String previousLifecycle;
  final int sequence;

  const AuctionStateChangedEvent({
    required this.auctionId,
    this.closesAt,
    this.startsAt,
    required this.lifecycle,
    required this.lotId,
    required this.previousLifecycle,
    required this.sequence,
  });

  static AuctionStateChangedEvent? fromJson(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    try {
      final auctionId = raw['auctionId'] as String?;
      final lifecycle = raw['lifecycle'] as String?;
      final previousLifecycle = raw['previousLifecycle'] as String? ?? 'PREVIEW';
      final lotId = raw['lotId'] as String?;
      final sequence = raw['sequence'] as int?;

      if (auctionId == null || lifecycle == null || lotId == null || sequence == null) {
        return null;
      }

      return AuctionStateChangedEvent(
        auctionId: auctionId,
        closesAt: raw['closesAt'] as String?,
        startsAt: raw['startsAt'] as String?,
        lifecycle: lifecycle,
        lotId: lotId,
        previousLifecycle: previousLifecycle,
        sequence: sequence,
      );
    } catch (_) {
      return null;
    }
  }
}

/// Emitted when reserve status changes: 'reserve:status-changed'
class ReserveStatusChangedEvent {
  final String auctionId;
  final String lotId;
  final String reserveStatus;
  final int sequence;

  const ReserveStatusChangedEvent({
    required this.auctionId,
    required this.lotId,
    required this.reserveStatus,
    required this.sequence,
  });

  static ReserveStatusChangedEvent? fromJson(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    try {
      final auctionId = raw['auctionId'] as String?;
      final lotId = raw['lotId'] as String?;
      final reserveStatus = raw['reserveStatus'] as String? ?? 'MET';
      final sequence = raw['sequence'] as int?;

      if (auctionId == null || lotId == null || sequence == null) return null;

      return ReserveStatusChangedEvent(
        auctionId: auctionId,
        lotId: lotId,
        reserveStatus: reserveStatus,
        sequence: sequence,
      );
    } catch (_) {
      return null;
    }
  }
}

/// Emitted when presence changes: 'lot:presence-changed' (flat lot event with sequence)
class LotPresenceChangedEvent {
  final String auctionId;
  final String lotId;
  final int sequence;
  final int approximateViewerCount;

  const LotPresenceChangedEvent({
    required this.auctionId,
    required this.lotId,
    required this.sequence,
    required this.approximateViewerCount,
  });

  /// Backward-compatible alias for approximateViewerCount
  int get viewersCount => approximateViewerCount;

  static LotPresenceChangedEvent? fromJson(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    try {
      final lotId = raw['lotId'] as String?;
      final auctionId = raw['auctionId'] as String? ?? '';
      final sequence = raw['sequence'] as int? ?? 0;
      final count = (raw['approximateViewerCount'] ?? raw['viewersCount']) as int? ?? 0;
      if (lotId == null) return null;
      return LotPresenceChangedEvent(
        auctionId: auctionId,
        lotId: lotId,
        sequence: sequence,
        approximateViewerCount: count,
      );
    } catch (_) {
      return null;
    }
  }
}

/// Personal event: 'bid:status-changed' (enveloped with nested 'data' key)
class MyBidStatusChangedEvent {
  final String closesAt;
  final Money? currentBid;
  final String lotId;
  final int lotSequence;
  final Money nextMinimumBid;
  final String status; // 'WINNING', 'OUTBID', 'ACCEPTED', 'REJECTED'

  const MyBidStatusChangedEvent({
    required this.closesAt,
    this.currentBid,
    required this.lotId,
    required this.lotSequence,
    required this.nextMinimumBid,
    required this.status,
  });

  static MyBidStatusChangedEvent? fromEnveloped(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    final data = raw['data'];
    if (data is! Map<String, dynamic>) return null;

    try {
      final closesAt = data['closesAt'] as String?;
      final lotId = data['lotId'] as String?;
      final lotSequence = data['lotSequence'] as int?;
      final status = data['status'] as String?;

      if (closesAt == null || lotId == null || lotSequence == null || status == null) {
        return null;
      }

      final currentBidRaw = data['currentBid'];
      final nextMinRaw = data['nextMinimumBid'];

      if (nextMinRaw is! Map<String, dynamic>) {
        return null;
      }

      Money? currentBid;
      if (currentBidRaw is Map<String, dynamic>) {
        currentBid = Money.fromJson(currentBidRaw);
      }

      return MyBidStatusChangedEvent(
        closesAt: closesAt,
        currentBid: currentBid,
        lotId: lotId,
        lotSequence: lotSequence,
        nextMinimumBid: Money.fromJson(nextMinRaw),
        status: status,
      );
    } catch (_) {
      return null;
    }
  }
}

/// Personal event: 'proxy-bid:changed' (enveloped)
class ProxyBidChangedEvent {
  final String lotId;
  final Money? activeProxyMaximum;
  final Money? currentBid;
  final int lotSequence;
  final Money? nextMinimumBid;
  final String status; // 'ACTIVE', 'EXCEEDED', 'CANCELLED', 'ENDED'

  const ProxyBidChangedEvent({
    required this.lotId,
    this.activeProxyMaximum,
    this.currentBid,
    this.lotSequence = 0,
    this.nextMinimumBid,
    required this.status,
  });

  /// Backward-compatible alias
  Money? get maximum => activeProxyMaximum;

  static ProxyBidChangedEvent? fromEnveloped(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    final data = raw['data'];
    if (data is! Map<String, dynamic>) return null;

    try {
      final lotId = data['lotId'] as String?;
      final status = data['status'] as String? ?? 'ACTIVE';
      if (lotId == null) return null;

      final maxRaw = data['activeProxyMaximum'] ?? data['maximum'];
      Money? activeProxyMaximum;
      if (maxRaw is Map<String, dynamic>) {
        activeProxyMaximum = Money.fromJson(maxRaw);
      }

      final currentBidRaw = data['currentBid'];
      Money? currentBid;
      if (currentBidRaw is Map<String, dynamic>) {
        currentBid = Money.fromJson(currentBidRaw);
      }

      final nextMinRaw = data['nextMinimumBid'];
      Money? nextMinimumBid;
      if (nextMinRaw is Map<String, dynamic>) {
        nextMinimumBid = Money.fromJson(nextMinRaw);
      }

      final lotSequence = data['lotSequence'] as int? ?? 0;

      return ProxyBidChangedEvent(
        lotId: lotId,
        activeProxyMaximum: activeProxyMaximum,
        currentBid: currentBid,
        lotSequence: lotSequence,
        nextMinimumBid: nextMinimumBid,
        status: status,
      );
    } catch (_) {
      return null;
    }
  }
}

/// Bid eligibility status details.
class BidEligibility {
  final bool eligible;
  final List<String> reasonCodes;
  final Money? eligibleDeposit;
  final Money? requiredDeposit;
  final String? termsVersionId;

  const BidEligibility({
    required this.eligible,
    this.reasonCodes = const [],
    this.eligibleDeposit,
    this.requiredDeposit,
    this.termsVersionId,
  });

  factory BidEligibility.fromJson(Map<String, dynamic> json) {
    final eligible = json['eligible'] as bool? ?? false;
    final reasonCodes = (json['reasonCodes'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        const [];

    Money? eligibleDeposit;
    if (json['eligibleDeposit'] is Map<String, dynamic>) {
      eligibleDeposit = Money.fromJson(json['eligibleDeposit'] as Map<String, dynamic>);
    }

    Money? requiredDeposit;
    if (json['requiredDeposit'] is Map<String, dynamic>) {
      requiredDeposit = Money.fromJson(json['requiredDeposit'] as Map<String, dynamic>);
    }

    final termsVersionId = json['termsVersionId'] as String?;

    return BidEligibility(
      eligible: eligible,
      reasonCodes: reasonCodes,
      eligibleDeposit: eligibleDeposit,
      requiredDeposit: requiredDeposit,
      termsVersionId: termsVersionId,
    );
  }
}

/// Personal event: 'eligibility:changed' (enveloped)
class EligibilityChangedEvent {
  final BidEligibility eligibility;
  final String? lotId;

  const EligibilityChangedEvent({
    required this.eligibility,
    this.lotId,
  });

  static EligibilityChangedEvent? fromEnveloped(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    final data = raw['data'];
    if (data is! Map<String, dynamic>) return null;

    try {
      final eligRaw = data['eligibility'];
      if (eligRaw is! Map<String, dynamic>) return null;
      final eligibility = BidEligibility.fromJson(eligRaw);
      final lotId = data['lotId'] as String?;

      return EligibilityChangedEvent(
        eligibility: eligibility,
        lotId: lotId,
      );
    } catch (_) {
      return null;
    }
  }
}
