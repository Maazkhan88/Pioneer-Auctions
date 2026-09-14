import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:pioneer_contracts/pioneer_contracts.dart';
import '../network/socket_events.dart';
import '../utils/uuid_service.dart';

enum BidGateReason {
  accountRestricted,
  depositInsufficient,
  depositRequired,
  kycPending,
  kycRequired,
  termsAcceptanceRequired,
}

BidGateReason? parseBidGateReason(String code) {
  switch (code) {
    case 'ACCOUNT_RESTRICTED':
      return BidGateReason.accountRestricted;
    case 'DEPOSIT_INSUFFICIENT':
      return BidGateReason.depositInsufficient;
    case 'DEPOSIT_REQUIRED':
      return BidGateReason.depositRequired;
    case 'KYC_PENDING':
      return BidGateReason.kycPending;
    case 'KYC_REQUIRED':
      return BidGateReason.kycRequired;
    case 'TERMS_ACCEPTANCE_REQUIRED':
      return BidGateReason.termsAcceptanceRequired;
    default:
      return null;
  }
}

/// Structured fee schedule configuration using integer basis points (1 bp = 0.01%).
class FeeSchedule {
  final int buyerPremiumBps;
  final int minimumPremiumFils;
  final int vatBps;

  const FeeSchedule({
    this.buyerPremiumBps = 500, // 5.00%
    this.minimumPremiumFils = 50000, // 500 AED in fils
    this.vatBps = 500, // 5.00%
  });

  static const FeeSchedule standard = FeeSchedule();
}

/// Computes UAE auction standard fee breakdown using pure integer arithmetic:
/// - Buyer's premium: 5% (500 bps) of hammer price, min 500 AED (50,000 fils)
/// - VAT: 5% (500 bps) on buyer's premium
/// - Total payable in fils
class FeeBreakdown {
  final int hammerPriceFils;
  final int buyerPremiumFils;
  final int vatFils;
  final int totalFils;
  final FeeSchedule schedule;

  const FeeBreakdown({
    required this.hammerPriceFils,
    required this.buyerPremiumFils,
    required this.vatFils,
    required this.totalFils,
    this.schedule = FeeSchedule.standard,
  });

  factory FeeBreakdown.calculate(
    int hammerPriceFils, [
    FeeSchedule schedule = FeeSchedule.standard,
  ]) {
    // Integer basis points: (fils * bps) ~/ 10000
    final calculatedPremium = (hammerPriceFils * schedule.buyerPremiumBps) ~/ 10000;
    final buyerPremiumFils = max(calculatedPremium, schedule.minimumPremiumFils);
    final vatFils = (buyerPremiumFils * schedule.vatBps) ~/ 10000;
    final totalFils = hammerPriceFils + buyerPremiumFils + vatFils;

    return FeeBreakdown(
      hammerPriceFils: hammerPriceFils,
      buyerPremiumFils: buyerPremiumFils,
      vatFils: vatFils,
      totalFils: totalFils,
      schedule: schedule,
    );
  }

  // Integer AED getters using integer division
  int get hammerPriceAed => hammerPriceFils ~/ 100;
  int get buyerPremiumAed => buyerPremiumFils ~/ 100;
  int get vatAed => vatFils ~/ 100;
  int get totalAed => totalFils ~/ 100;
}

/// Immutable snapshot of a bid command in-flight or pending retry.
/// Preserves exact commandId and payload parameters per docs/api-contracts.md §8.
class PendingBidCommand {
  final String commandId;
  final String lotId;
  final int amountFils;
  final int expectedSequence;
  final String termsVersionId;
  final int contractVersion;
  final DateTime sentAt;

  const PendingBidCommand({
    required this.commandId,
    required this.lotId,
    required this.amountFils,
    required this.expectedSequence,
    required this.termsVersionId,
    this.contractVersion = 1,
    required this.sentAt,
  });

  PendingBidCommand copyWith({
    String? commandId,
    String? lotId,
    int? amountFils,
    int? expectedSequence,
    String? termsVersionId,
    int? contractVersion,
    DateTime? sentAt,
  }) {
    return PendingBidCommand(
      commandId: commandId ?? this.commandId,
      lotId: lotId ?? this.lotId,
      amountFils: amountFils ?? this.amountFils,
      expectedSequence: expectedSequence ?? this.expectedSequence,
      termsVersionId: termsVersionId ?? this.termsVersionId,
      contractVersion: contractVersion ?? this.contractVersion,
      sentAt: sentAt ?? this.sentAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PendingBidCommand &&
          runtimeType == other.runtimeType &&
          commandId == other.commandId &&
          lotId == other.lotId &&
          amountFils == other.amountFils &&
          expectedSequence == other.expectedSequence &&
          termsVersionId == other.termsVersionId &&
          contractVersion == other.contractVersion;

  @override
  int get hashCode =>
      commandId.hashCode ^
      lotId.hashCode ^
      amountFils.hashCode ^
      expectedSequence.hashCode ^
      termsVersionId.hashCode ^
      contractVersion.hashCode;
}

sealed class BidState {
  const BidState();
}

class BidIdle extends BidState {
  const BidIdle();
}

class BidConfirming extends BidState {
  final PendingBidCommand command;
  final bool termsAccepted;
  final FeeBreakdown feeBreakdown;

  int get amountFils => command.amountFils;
  String get commandId => command.commandId;
  String get lotId => command.lotId;
  int get expectedSequence => command.expectedSequence;
  String get termsVersionId => command.termsVersionId;

  const BidConfirming({
    required this.command,
    required this.termsAccepted,
    required this.feeBreakdown,
  });

  BidConfirming copyWith({bool? termsAccepted}) {
    return BidConfirming(
      command: command,
      termsAccepted: termsAccepted ?? this.termsAccepted,
      feeBreakdown: feeBreakdown,
    );
  }
}

class BidSubmitting extends BidState {
  final PendingBidCommand command;

  int get amountFils => command.amountFils;
  String get commandId => command.commandId;
  String get lotId => command.lotId;
  int get expectedSequence => command.expectedSequence;

  const BidSubmitting({required this.command});
}

class BidAccepted extends BidState {
  final String commandId;
  final int amountFils;
  final int sequence;
  final String closesAt;
  final int currentBidFils;
  final bool extended;
  final String myBidStatus;
  final int nextMinimumBidFils;

  const BidAccepted({
    required this.commandId,
    required this.amountFils,
    required this.sequence,
    required this.closesAt,
    required this.currentBidFils,
    required this.extended,
    required this.myBidStatus,
    required this.nextMinimumBidFils,
  });
}

class BidRejected extends BidState {
  final String commandId;
  final int amountFils;
  final String code;
  final String message;
  final bool retryable;
  final Map<String, dynamic>? latest;

  const BidRejected({
    required this.commandId,
    required this.amountFils,
    required this.code,
    required this.message,
    required this.retryable,
    this.latest,
  });
}

class BidUnknown extends BidState {
  final PendingBidCommand command;
  final String message;

  int get amountFils => command.amountFils;
  String get commandId => command.commandId;
  String get lotId => command.lotId;

  const BidUnknown({
    required this.command,
    required this.message,
  });
}

class BidOutbid extends BidState {
  final int currentBidFils;
  final int nextMinimumBidFils;
  final String message;

  const BidOutbid({
    required this.currentBidFils,
    required this.nextMinimumBidFils,
    required this.message,
  });
}

class BidGated extends BidState {
  final int amountFils;
  final BidGateReason reason;
  final String message;

  const BidGated({
    required this.amountFils,
    required this.reason,
    required this.message,
  });
}

class BidClosed extends BidState {
  final String lifecycle;
  final String message;

  const BidClosed({
    required this.lifecycle,
    required this.message,
  });
}

class BidResyncing extends BidState {
  final String lotId;

  const BidResyncing({required this.lotId});
}

/// Authoritative mobile bid state machine.
/// Guarantees exact commandId preservation across timeout retries and ensures
/// authoritative server values overwrite any local optimistic state.
class BidStateMachine extends ChangeNotifier {
  BidState _state = const BidIdle();
  BidState get state => _state;

  PendingBidCommand? _activeCommand;
  PendingBidCommand? get activeCommand => _activeCommand;

  VoidCallback? onAuthoritativeSuccess;
  VoidCallback? onAuthoritativeFailure;

  void resetToIdle() {
    _state = const BidIdle();
    _activeCommand = null;
    notifyListeners();
  }

  /// Initiates bid confirmation (shows fees, terms gate).
  void startConfirming({
    String lotId = '',
    required int amountFils,
    required int expectedSequence,
    String termsVersionId = '',
    bool termsAccepted = false,
  }) {
    final command = PendingBidCommand(
      commandId: UuidService.generate(),
      lotId: lotId,
      amountFils: amountFils,
      expectedSequence: expectedSequence,
      termsVersionId: termsVersionId,
      sentAt: DateTime.now().toUtc(),
    );
    _activeCommand = command;
    final feeBreakdown = FeeBreakdown.calculate(amountFils);

    _state = BidConfirming(
      command: command,
      termsAccepted: termsAccepted,
      feeBreakdown: feeBreakdown,
    );
    notifyListeners();
  }

  void setTermsAccepted(bool accepted) {
    if (_state is BidConfirming) {
      _state = (_state as BidConfirming).copyWith(termsAccepted: accepted);
      notifyListeners();
    }
  }

  /// Transitions to submitting. Returns the commandId to send with the request.
  String? startSubmitting() {
    if (_state is BidConfirming) {
      final confirming = _state as BidConfirming;
      if (!confirming.termsAccepted) {
        _state = BidGated(
          amountFils: confirming.amountFils,
          reason: BidGateReason.termsAcceptanceRequired,
          message: 'You must accept the Pioneer Auctions Terms & Conditions before placing a bid.',
        );
        notifyListeners();
        return null;
      }

      _activeCommand = confirming.command;
      _state = BidSubmitting(command: confirming.command);
      notifyListeners();
      return confirming.command.commandId;
    } else if (_state is BidUnknown) {
      // Retrying from unknown state -- MUST RETAIN identical PendingBidCommand!
      final unknown = _state as BidUnknown;
      _activeCommand = unknown.command;
      _state = BidSubmitting(command: unknown.command);
      notifyListeners();
      return unknown.command.commandId;
    }
    return null;
  }

  /// Applies authoritative CommandAck from REST or Socket.
  void handleCommandAck(
    CommandAck ack, {
    PendingBidCommand? command,
    int? amountFils,
  }) {
    final cmd = command ??
        _activeCommand ??
        PendingBidCommand(
          commandId: ack.commandId,
          lotId: ack.result?.lotId ?? '',
          amountFils: amountFils ?? ack.result?.currentBid.amountFils ?? 0,
          expectedSequence: 0,
          termsVersionId: '',
          sentAt: ack.serverTime,
        );

    // Validate commandId matches active command; ignore stale or mismatched acks
    if (ack.commandId != cmd.commandId) {
      return;
    }

    // Deduplicate: If already accepted or rejected for this commandId, ignore
    if (_state is BidAccepted && (_state as BidAccepted).commandId == ack.commandId) {
      return;
    }
    if (_state is BidRejected && (_state as BidRejected).commandId == ack.commandId) {
      return;
    }

    if (ack.status == CommandAckStatus.ACCEPTED) {
      final res = ack.result;
      if (res == null) {
        // Missing required result fields! Per Finding 2, transition to BidUnknown
        _state = BidUnknown(
          command: cmd,
          message: 'Server accepted bid but omitted authoritative result details.',
        );
        notifyListeners();
        return;
      }

      _state = BidAccepted(
        commandId: ack.commandId,
        amountFils: cmd.amountFils,
        sequence: res.sequence,
        closesAt: res.closesAt.toIso8601String(),
        currentBidFils: res.currentBid.amountFils,
        extended: res.extended,
        myBidStatus: myBidStatusValues.reverse[res.myBidStatus] ?? 'WINNING',
        nextMinimumBidFils: res.nextMinimumBid.amountFils,
      );
      notifyListeners();
      onAuthoritativeSuccess?.call();
    } else {
      final code = ack.error?.code.name ?? 'REJECTED';
      final message = ack.error?.message ?? 'Bid was rejected by server.';
      final retryable = ack.error?.retryable ?? false;

      _handleRejection(
        command: cmd,
        code: code,
        message: message,
        retryable: retryable,
        latest: ack.latest?.toJson(),
      );
    }
  }

  /// Handles transport-level rejection or SocketCommandFailure.
  void handleFailure({
    PendingBidCommand? command,
    int? amountFils,
    required String code,
    required String message,
    bool retryable = false,
    Map<String, dynamic>? latest,
  }) {
    final cmd = command ??
        _activeCommand ??
        PendingBidCommand(
          commandId: UuidService.generate(),
          lotId: '',
          amountFils: amountFils ?? 0,
          expectedSequence: 0,
          termsVersionId: '',
          sentAt: DateTime.now().toUtc(),
        );

    _handleRejection(
      command: cmd,
      code: code,
      message: message,
      retryable: retryable,
      latest: latest,
    );
  }

  void _handleRejection({
    required PendingBidCommand command,
    required String code,
    required String message,
    required bool retryable,
    Map<String, dynamic>? latest,
  }) {
    if (code == 'AUCTION_CLOSED') {
      _state = BidClosed(
        lifecycle: 'CLOSED',
        message: 'This auction has closed.',
      );
    } else {
      final gateReason = parseBidGateReason(code);
      if (gateReason != null) {
        _state = BidGated(
          amountFils: command.amountFils,
          reason: gateReason,
          message: message,
        );
      } else {
        _state = BidRejected(
          commandId: command.commandId,
          amountFils: command.amountFils,
          code: code,
          message: message,
          retryable: retryable,
          latest: latest,
        );
      }
    }
    notifyListeners();
    onAuthoritativeFailure?.call();
  }

  /// Handles timeout or unknown outcome. Retains complete command for retry.
  void handleUnknown({
    PendingBidCommand? command,
    int? amountFils,
    String? commandId,
    required String message,
  }) {
    final cmd = command ??
        _activeCommand ??
        PendingBidCommand(
          commandId: commandId ?? UuidService.generate(),
          lotId: '',
          amountFils: amountFils ?? 0,
          expectedSequence: 0,
          termsVersionId: '',
          sentAt: DateTime.now().toUtc(),
        );

    _activeCommand = cmd;
    _state = BidUnknown(
      command: cmd,
      message: message,
    );
    notifyListeners();
  }

  /// External event: incoming bid:accepted from another participant.
  void handleExternalBidAccepted(BidAcceptedEvent event) {
    if (_state is BidAccepted) {
      final accepted = _state as BidAccepted;
      if (event.amount.amountFils > accepted.amountFils) {
        _state = BidOutbid(
          currentBidFils: event.currentBid.amountFils,
          nextMinimumBidFils: event.nextMinimumBid.amountFils,
          message: 'You have been outbid.',
        );
        notifyListeners();
      }
    }
  }

  /// External event: personal bid:status-changed.
  void handleMyBidStatusChanged(MyBidStatusChangedEvent event) {
    if (event.status == 'OUTBID') {
      _state = BidOutbid(
        currentBidFils: event.currentBid?.amountFils ?? 0,
        nextMinimumBidFils: event.nextMinimumBid.amountFils,
        message: 'You have been outbid.',
      );
      notifyListeners();
    }
  }

  /// External event: personal eligibility:changed.
  void handleEligibilityChanged(EligibilityChangedEvent event) {
    if (!event.eligibility.eligible) {
      final reasonCode = event.eligibility.reasonCodes.isNotEmpty
          ? event.eligibility.reasonCodes.first
          : 'ACCOUNT_RESTRICTED';
      final gateReason = parseBidGateReason(reasonCode) ?? BidGateReason.accountRestricted;
      _state = BidGated(
        amountFils: 0,
        reason: gateReason,
        message: _getLocalizedGateMessage(reasonCode),
      );
      notifyListeners();
    }
  }

  String _getLocalizedGateMessage(String reasonCode) {
    switch (reasonCode) {
      case 'KYC_REQUIRED':
        return 'Identity verification required before placing a bid.';
      case 'KYC_PENDING':
        return 'Your Emirates ID verification is currently pending review.';
      case 'DEPOSIT_REQUIRED':
        return 'A security deposit is required to participate in this auction.';
      case 'DEPOSIT_INSUFFICIENT':
        return 'Your available deposit is insufficient for this bid amount.';
      case 'TERMS_ACCEPTANCE_REQUIRED':
        return 'You must accept the Pioneer Auctions Terms & Conditions.';
      case 'ACCOUNT_RESTRICTED':
      default:
        return 'Your account is restricted from placing bids.';
    }
  }

  /// External event: auction state changed.
  void handleAuctionStateChanged(AuctionStateChangedEvent event) {
    if (event.lifecycle != 'LIVE') {
      _state = BidClosed(
        lifecycle: event.lifecycle,
        message: 'Auction lifecycle changed to ${event.lifecycle}.',
      );
      notifyListeners();
    }
  }

  /// Sequence gap detected; client is resyncing snapshot.
  void handleGapDetected(String lotId) {
    _state = BidResyncing(lotId: lotId);
    notifyListeners();
  }
}
