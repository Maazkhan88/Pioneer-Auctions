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

/// Computes UAE auction standard fee breakdown:
/// - Buyer's premium: 5% of hammer price (min 500 AED / 50,000 fils)
/// - VAT: 5% on buyer's premium
/// - Total payable
class FeeBreakdown {
  final int hammerPriceFils;
  final int buyerPremiumFils;
  final int vatFils;
  final int totalFils;

  const FeeBreakdown({
    required this.hammerPriceFils,
    required this.buyerPremiumFils,
    required this.vatFils,
    required this.totalFils,
  });

  factory FeeBreakdown.calculate(int hammerPriceFils) {
    // 5% premium, minimum 500 AED (50,000 fils)
    final calculatedPremium = (hammerPriceFils * 0.05).round();
    final buyerPremiumFils = max(calculatedPremium, 50000);
    // 5% VAT on buyer premium
    final vatFils = (buyerPremiumFils * 0.05).round();
    final totalFils = hammerPriceFils + buyerPremiumFils + vatFils;

    return FeeBreakdown(
      hammerPriceFils: hammerPriceFils,
      buyerPremiumFils: buyerPremiumFils,
      vatFils: vatFils,
      totalFils: totalFils,
    );
  }

  double get hammerPriceAed => hammerPriceFils / 100.0;
  double get buyerPremiumAed => buyerPremiumFils / 100.0;
  double get vatAed => vatFils / 100.0;
  double get totalAed => totalFils / 100.0;
}

sealed class BidState {
  const BidState();
}

class BidIdle extends BidState {
  const BidIdle();
}

class BidConfirming extends BidState {
  final int amountFils;
  final String commandId;
  final int expectedSequence;
  final bool termsAccepted;
  final FeeBreakdown feeBreakdown;

  const BidConfirming({
    required this.amountFils,
    required this.commandId,
    required this.expectedSequence,
    required this.termsAccepted,
    required this.feeBreakdown,
  });

  BidConfirming copyWith({bool? termsAccepted}) {
    return BidConfirming(
      amountFils: amountFils,
      commandId: commandId,
      expectedSequence: expectedSequence,
      termsAccepted: termsAccepted ?? this.termsAccepted,
      feeBreakdown: feeBreakdown,
    );
  }
}

class BidSubmitting extends BidState {
  final int amountFils;
  final String commandId;
  final int expectedSequence;

  const BidSubmitting({
    required this.amountFils,
    required this.commandId,
    required this.expectedSequence,
  });
}

class BidAccepted extends BidState {
  final int amountFils;
  final int sequence;
  final String closesAt;
  final int currentBidFils;
  final bool extended;
  final String myBidStatus;
  final int nextMinimumBidFils;

  const BidAccepted({
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
  final int amountFils;
  final String code;
  final String message;
  final bool retryable;
  final Map<String, dynamic>? latest;

  const BidRejected({
    required this.amountFils,
    required this.code,
    required this.message,
    required this.retryable,
    this.latest,
  });
}

class BidUnknown extends BidState {
  final int amountFils;
  final String commandId;
  final String message;

  const BidUnknown({
    required this.amountFils,
    required this.commandId,
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
/// Ensures NO optimistic bid acceptance and guarantees exact commandId preservation
/// across timeout retries per docs/api-contracts.md §8.
class BidStateMachine extends ChangeNotifier {
  BidState _state = const BidIdle();
  BidState get state => _state;

  VoidCallback? onAuthoritativeSuccess;
  VoidCallback? onAuthoritativeFailure;

  void resetToIdle() {
    _state = const BidIdle();
    notifyListeners();
  }

  /// Initiates bid confirmation (shows fees, terms gate).
  void startConfirming({
    required int amountFils,
    required int expectedSequence,
    bool termsAccepted = false,
  }) {
    final commandId = UuidService.generate();
    final feeBreakdown = FeeBreakdown.calculate(amountFils);

    _state = BidConfirming(
      amountFils: amountFils,
      commandId: commandId,
      expectedSequence: expectedSequence,
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

      _state = BidSubmitting(
        amountFils: confirming.amountFils,
        commandId: confirming.commandId,
        expectedSequence: confirming.expectedSequence,
      );
      notifyListeners();
      return confirming.commandId;
    } else if (_state is BidUnknown) {
      // Retrying from unknown state -- MUST RETAIN identical commandId!
      final unknown = _state as BidUnknown;
      _state = BidSubmitting(
        amountFils: unknown.amountFils,
        commandId: unknown.commandId,
        expectedSequence: 0,
      );
      notifyListeners();
      return unknown.commandId;
    }
    return null;
  }

  /// Applies authoritative CommandAck from REST or Socket.
  void handleCommandAck(CommandAck ack, {required int amountFils}) {
    if (ack.status == CommandAckStatus.ACCEPTED) {
      final res = ack.result;
      _state = BidAccepted(
        amountFils: amountFils,
        sequence: res?.sequence ?? 0,
        closesAt: res?.closesAt.toIso8601String() ?? '',
        currentBidFils: res?.currentBid.amountFils ?? amountFils,
        extended: res?.extended ?? false,
        myBidStatus: res != null ? (myBidStatusValues.reverse[res.myBidStatus] ?? 'WINNING') : 'WINNING',
        nextMinimumBidFils: res?.nextMinimumBid.amountFils ?? (amountFils + 100000),
      );
      notifyListeners();
      onAuthoritativeSuccess?.call();
    } else {
      final code = ack.error?.code.name ?? 'REJECTED';
      final message = ack.error?.message ?? 'Bid was rejected by server.';
      final retryable = ack.error?.retryable ?? false;

      _handleRejection(
        amountFils: amountFils,
        code: code,
        message: message,
        retryable: retryable,
        latest: ack.latest?.toJson(),
      );
    }
  }

  /// Handles transport-level rejection or SocketCommandFailure.
  void handleFailure({
    required int amountFils,
    required String code,
    required String message,
    bool retryable = false,
    Map<String, dynamic>? latest,
  }) {
    _handleRejection(
      amountFils: amountFils,
      code: code,
      message: message,
      retryable: retryable,
      latest: latest,
    );
  }

  void _handleRejection({
    required int amountFils,
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
          amountFils: amountFils,
          reason: gateReason,
          message: message,
        );
      } else {
        _state = BidRejected(
          amountFils: amountFils,
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

  /// Handles timeout or unknown outcome. Retains commandId for retry.
  void handleUnknown({
    required int amountFils,
    required String commandId,
    required String message,
  }) {
    _state = BidUnknown(
      amountFils: amountFils,
      commandId: commandId,
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
        currentBidFils: event.currentBid.amountFils,
        nextMinimumBidFils: event.nextMinimumBid.amountFils,
        message: 'You have been outbid.',
      );
      notifyListeners();
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
