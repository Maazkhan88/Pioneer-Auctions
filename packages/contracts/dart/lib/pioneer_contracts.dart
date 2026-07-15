import 'dart:convert';

class PioneerContracts {
    CommandAck commandAck;
    LotSnapshot lotSnapshot;
    Money money;
    PlaceBidCommand placeBidCommand;

    PioneerContracts({
        required this.commandAck,
        required this.lotSnapshot,
        required this.money,
        required this.placeBidCommand,
    });

    factory PioneerContracts.fromRawJson(String str) => PioneerContracts.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory PioneerContracts.fromJson(Map<String, dynamic> json) => PioneerContracts(
        commandAck: CommandAck.fromJson(json["commandAck"]),
        lotSnapshot: LotSnapshot.fromJson(json["lotSnapshot"]),
        money: Money.fromJson(json["money"]),
        placeBidCommand: PlaceBidCommand.fromJson(json["placeBidCommand"]),
    );

    Map<String, dynamic> toJson() => {
        "commandAck": commandAck.toJson(),
        "lotSnapshot": lotSnapshot.toJson(),
        "money": money.toJson(),
        "placeBidCommand": placeBidCommand.toJson(),
    };
}

class CommandAck {
    String commandId;
    int contractVersion;
    String correlationId;
    Result? result;
    DateTime serverTime;
    CommandAckStatus status;
    Error? error;
    Latest? latest;

    CommandAck({
        required this.commandId,
        required this.contractVersion,
        required this.correlationId,
        this.result,
        required this.serverTime,
        required this.status,
        this.error,
        this.latest,
    });

    factory CommandAck.fromRawJson(String str) => CommandAck.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory CommandAck.fromJson(Map<String, dynamic> json) => CommandAck(
        commandId: json["commandId"],
        contractVersion: json["contractVersion"],
        correlationId: json["correlationId"],
        result: json["result"] == null ? null : Result.fromJson(json["result"]),
        serverTime: DateTime.parse(json["serverTime"]),
        status: commandAckStatusValues.map[json["status"]]!,
        error: json["error"] == null ? null : Error.fromJson(json["error"]),
        latest: json["latest"] == null ? null : Latest.fromJson(json["latest"]),
    );

    Map<String, dynamic> toJson() => {
        "commandId": commandId,
        "contractVersion": contractVersion,
        "correlationId": correlationId,
        "result": result?.toJson(),
        "serverTime": serverTime.toIso8601String(),
        "status": commandAckStatusValues.reverse[status],
        "error": error?.toJson(),
        "latest": latest?.toJson(),
    };
}

class Error {
    Code code;
    String message;
    bool retryable;
    int? retryAfterMs;

    Error({
        required this.code,
        required this.message,
        required this.retryable,
        this.retryAfterMs,
    });

    factory Error.fromRawJson(String str) => Error.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory Error.fromJson(Map<String, dynamic> json) => Error(
        code: codeValues.map[json["code"]]!,
        message: json["message"],
        retryable: json["retryable"],
        retryAfterMs: json["retryAfterMs"],
    );

    Map<String, dynamic> toJson() => {
        "code": codeValues.reverse[code],
        "message": message,
        "retryable": retryable,
        "retryAfterMs": retryAfterMs,
    };
}

enum Code {
    ACCOUNT_RESTRICTED,
    AUCTION_CLOSED,
    AUCTION_NOT_LIVE,
    AUCTION_PAUSED,
    AUTH_FORBIDDEN,
    AUTH_REQUIRED,
    BID_AMOUNT_INVALID,
    BID_TOO_LOW,
    COMMAND_CONFLICT,
    DEPOSIT_INSUFFICIENT,
    DEPOSIT_REQUIRED,
    INTERNAL_ERROR,
    KYC_PENDING,
    KYC_REQUIRED,
    LOT_NOT_BIDDABLE,
    LOT_NOT_FOUND,
    OFFER_NOT_ALLOWED,
    PROVIDER_UNAVAILABLE,
    PROXY_MAX_TOO_LOW,
    RATE_LIMITED,
    TERMS_ACCEPTANCE_REQUIRED,
    VALIDATION_FAILED
}

final codeValues = EnumValues({
    "ACCOUNT_RESTRICTED": Code.ACCOUNT_RESTRICTED,
    "AUCTION_CLOSED": Code.AUCTION_CLOSED,
    "AUCTION_NOT_LIVE": Code.AUCTION_NOT_LIVE,
    "AUCTION_PAUSED": Code.AUCTION_PAUSED,
    "AUTH_FORBIDDEN": Code.AUTH_FORBIDDEN,
    "AUTH_REQUIRED": Code.AUTH_REQUIRED,
    "BID_AMOUNT_INVALID": Code.BID_AMOUNT_INVALID,
    "BID_TOO_LOW": Code.BID_TOO_LOW,
    "COMMAND_CONFLICT": Code.COMMAND_CONFLICT,
    "DEPOSIT_INSUFFICIENT": Code.DEPOSIT_INSUFFICIENT,
    "DEPOSIT_REQUIRED": Code.DEPOSIT_REQUIRED,
    "INTERNAL_ERROR": Code.INTERNAL_ERROR,
    "KYC_PENDING": Code.KYC_PENDING,
    "KYC_REQUIRED": Code.KYC_REQUIRED,
    "LOT_NOT_BIDDABLE": Code.LOT_NOT_BIDDABLE,
    "LOT_NOT_FOUND": Code.LOT_NOT_FOUND,
    "OFFER_NOT_ALLOWED": Code.OFFER_NOT_ALLOWED,
    "PROVIDER_UNAVAILABLE": Code.PROVIDER_UNAVAILABLE,
    "PROXY_MAX_TOO_LOW": Code.PROXY_MAX_TOO_LOW,
    "RATE_LIMITED": Code.RATE_LIMITED,
    "TERMS_ACCEPTANCE_REQUIRED": Code.TERMS_ACCEPTANCE_REQUIRED,
    "VALIDATION_FAILED": Code.VALIDATION_FAILED
});

class Latest {
    DateTime closesAt;
    LatestCurrentBid currentBid;
    String lotId;
    LatestNextMinimumBid nextMinimumBid;
    int sequence;

    Latest({
        required this.closesAt,
        required this.currentBid,
        required this.lotId,
        required this.nextMinimumBid,
        required this.sequence,
    });

    factory Latest.fromRawJson(String str) => Latest.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory Latest.fromJson(Map<String, dynamic> json) => Latest(
        closesAt: DateTime.parse(json["closesAt"]),
        currentBid: LatestCurrentBid.fromJson(json["currentBid"]),
        lotId: json["lotId"],
        nextMinimumBid: LatestNextMinimumBid.fromJson(json["nextMinimumBid"]),
        sequence: json["sequence"],
    );

    Map<String, dynamic> toJson() => {
        "closesAt": closesAt.toIso8601String(),
        "currentBid": currentBid.toJson(),
        "lotId": lotId,
        "nextMinimumBid": nextMinimumBid.toJson(),
        "sequence": sequence,
    };
}

class LatestCurrentBid {
    int amountFils;
    Currency currency;

    LatestCurrentBid({
        required this.amountFils,
        required this.currency,
    });

    factory LatestCurrentBid.fromRawJson(String str) => LatestCurrentBid.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory LatestCurrentBid.fromJson(Map<String, dynamic> json) => LatestCurrentBid(
        amountFils: json["amountFils"],
        currency: currencyValues.map[json["currency"]]!,
    );

    Map<String, dynamic> toJson() => {
        "amountFils": amountFils,
        "currency": currencyValues.reverse[currency],
    };
}

enum Currency {
    AED
}

final currencyValues = EnumValues({
    "AED": Currency.AED
});

class LatestNextMinimumBid {
    int amountFils;
    Currency currency;

    LatestNextMinimumBid({
        required this.amountFils,
        required this.currency,
    });

    factory LatestNextMinimumBid.fromRawJson(String str) => LatestNextMinimumBid.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory LatestNextMinimumBid.fromJson(Map<String, dynamic> json) => LatestNextMinimumBid(
        amountFils: json["amountFils"],
        currency: currencyValues.map[json["currency"]]!,
    );

    Map<String, dynamic> toJson() => {
        "amountFils": amountFils,
        "currency": currencyValues.reverse[currency],
    };
}

class Result {
    DateTime closesAt;
    ResultCurrentBid currentBid;
    bool extended;
    String lotId;
    MyBidStatus myBidStatus;
    ResultNextMinimumBid nextMinimumBid;
    ReserveStatus reserveStatus;
    int sequence;

    Result({
        required this.closesAt,
        required this.currentBid,
        required this.extended,
        required this.lotId,
        required this.myBidStatus,
        required this.nextMinimumBid,
        required this.reserveStatus,
        required this.sequence,
    });

    factory Result.fromRawJson(String str) => Result.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory Result.fromJson(Map<String, dynamic> json) => Result(
        closesAt: DateTime.parse(json["closesAt"]),
        currentBid: ResultCurrentBid.fromJson(json["currentBid"]),
        extended: json["extended"],
        lotId: json["lotId"],
        myBidStatus: myBidStatusValues.map[json["myBidStatus"]]!,
        nextMinimumBid: ResultNextMinimumBid.fromJson(json["nextMinimumBid"]),
        reserveStatus: reserveStatusValues.map[json["reserveStatus"]]!,
        sequence: json["sequence"],
    );

    Map<String, dynamic> toJson() => {
        "closesAt": closesAt.toIso8601String(),
        "currentBid": currentBid.toJson(),
        "extended": extended,
        "lotId": lotId,
        "myBidStatus": myBidStatusValues.reverse[myBidStatus],
        "nextMinimumBid": nextMinimumBid.toJson(),
        "reserveStatus": reserveStatusValues.reverse[reserveStatus],
        "sequence": sequence,
    };
}

class ResultCurrentBid {
    int amountFils;
    Currency currency;

    ResultCurrentBid({
        required this.amountFils,
        required this.currency,
    });

    factory ResultCurrentBid.fromRawJson(String str) => ResultCurrentBid.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory ResultCurrentBid.fromJson(Map<String, dynamic> json) => ResultCurrentBid(
        amountFils: json["amountFils"],
        currency: currencyValues.map[json["currency"]]!,
    );

    Map<String, dynamic> toJson() => {
        "amountFils": amountFils,
        "currency": currencyValues.reverse[currency],
    };
}

enum MyBidStatus {
    OUTBID,
    WINNING
}

final myBidStatusValues = EnumValues({
    "OUTBID": MyBidStatus.OUTBID,
    "WINNING": MyBidStatus.WINNING
});

class ResultNextMinimumBid {
    int amountFils;
    Currency currency;

    ResultNextMinimumBid({
        required this.amountFils,
        required this.currency,
    });

    factory ResultNextMinimumBid.fromRawJson(String str) => ResultNextMinimumBid.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory ResultNextMinimumBid.fromJson(Map<String, dynamic> json) => ResultNextMinimumBid(
        amountFils: json["amountFils"],
        currency: currencyValues.map[json["currency"]]!,
    );

    Map<String, dynamic> toJson() => {
        "amountFils": amountFils,
        "currency": currencyValues.reverse[currency],
    };
}

enum ReserveStatus {
    MET,
    NOT_APPLICABLE,
    NOT_MET
}

final reserveStatusValues = EnumValues({
    "MET": ReserveStatus.MET,
    "NOT_APPLICABLE": ReserveStatus.NOT_APPLICABLE,
    "NOT_MET": ReserveStatus.NOT_MET
});

enum CommandAckStatus {
    ACCEPTED,
    REJECTED
}

final commandAckStatusValues = EnumValues({
    "ACCEPTED": CommandAckStatus.ACCEPTED,
    "REJECTED": CommandAckStatus.REJECTED
});

class LotSnapshot {
    String auctionId;
    int contractVersion;
    Event event;
    DateTime generatedAt;
    String lotId;
    MyBidState? myBidState;
    int sequence;
    State state;

    LotSnapshot({
        required this.auctionId,
        required this.contractVersion,
        required this.event,
        required this.generatedAt,
        required this.lotId,
        this.myBidState,
        required this.sequence,
        required this.state,
    });

    factory LotSnapshot.fromRawJson(String str) => LotSnapshot.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory LotSnapshot.fromJson(Map<String, dynamic> json) => LotSnapshot(
        auctionId: json["auctionId"],
        contractVersion: json["contractVersion"],
        event: eventValues.map[json["event"]]!,
        generatedAt: DateTime.parse(json["generatedAt"]),
        lotId: json["lotId"],
        myBidState: json["myBidState"] == null ? null : MyBidState.fromJson(json["myBidState"]),
        sequence: json["sequence"],
        state: State.fromJson(json["state"]),
    );

    Map<String, dynamic> toJson() => {
        "auctionId": auctionId,
        "contractVersion": contractVersion,
        "event": eventValues.reverse[event],
        "generatedAt": generatedAt.toIso8601String(),
        "lotId": lotId,
        "myBidState": myBidState?.toJson(),
        "sequence": sequence,
        "state": state.toJson(),
    };
}

enum Event {
    LOT_SNAPSHOT
}

final eventValues = EnumValues({
    "lot:snapshot": Event.LOT_SNAPSHOT
});

class MyBidState {
    ActiveProxyMaximum? activeProxyMaximum;
    Eligibility eligibility;
    MyHighestVisibleBid? myHighestVisibleBid;
    MyBidStateStatus status;

    MyBidState({
        required this.activeProxyMaximum,
        required this.eligibility,
        required this.myHighestVisibleBid,
        required this.status,
    });

    factory MyBidState.fromRawJson(String str) => MyBidState.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory MyBidState.fromJson(Map<String, dynamic> json) => MyBidState(
        activeProxyMaximum: json["activeProxyMaximum"] == null ? null : ActiveProxyMaximum.fromJson(json["activeProxyMaximum"]),
        eligibility: Eligibility.fromJson(json["eligibility"]),
        myHighestVisibleBid: json["myHighestVisibleBid"] == null ? null : MyHighestVisibleBid.fromJson(json["myHighestVisibleBid"]),
        status: myBidStateStatusValues.map[json["status"]]!,
    );

    Map<String, dynamic> toJson() => {
        "activeProxyMaximum": activeProxyMaximum?.toJson(),
        "eligibility": eligibility.toJson(),
        "myHighestVisibleBid": myHighestVisibleBid?.toJson(),
        "status": myBidStateStatusValues.reverse[status],
    };
}

class ActiveProxyMaximum {
    int amountFils;
    Currency currency;

    ActiveProxyMaximum({
        required this.amountFils,
        required this.currency,
    });

    factory ActiveProxyMaximum.fromRawJson(String str) => ActiveProxyMaximum.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory ActiveProxyMaximum.fromJson(Map<String, dynamic> json) => ActiveProxyMaximum(
        amountFils: json["amountFils"],
        currency: currencyValues.map[json["currency"]]!,
    );

    Map<String, dynamic> toJson() => {
        "amountFils": amountFils,
        "currency": currencyValues.reverse[currency],
    };
}

class Eligibility {
    bool eligible;
    EligibleDeposit? eligibleDeposit;
    List<ReasonCode> reasonCodes;
    RequiredDeposit? requiredDeposit;
    String? termsVersionId;

    Eligibility({
        required this.eligible,
        this.eligibleDeposit,
        required this.reasonCodes,
        this.requiredDeposit,
        this.termsVersionId,
    });

    factory Eligibility.fromRawJson(String str) => Eligibility.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory Eligibility.fromJson(Map<String, dynamic> json) => Eligibility(
        eligible: json["eligible"],
        eligibleDeposit: json["eligibleDeposit"] == null ? null : EligibleDeposit.fromJson(json["eligibleDeposit"]),
        reasonCodes: List<ReasonCode>.from(json["reasonCodes"].map((x) => reasonCodeValues.map[x]!)),
        requiredDeposit: json["requiredDeposit"] == null ? null : RequiredDeposit.fromJson(json["requiredDeposit"]),
        termsVersionId: json["termsVersionId"],
    );

    Map<String, dynamic> toJson() => {
        "eligible": eligible,
        "eligibleDeposit": eligibleDeposit?.toJson(),
        "reasonCodes": List<dynamic>.from(reasonCodes.map((x) => reasonCodeValues.reverse[x])),
        "requiredDeposit": requiredDeposit?.toJson(),
        "termsVersionId": termsVersionId,
    };
}

class EligibleDeposit {
    int amountFils;
    Currency currency;

    EligibleDeposit({
        required this.amountFils,
        required this.currency,
    });

    factory EligibleDeposit.fromRawJson(String str) => EligibleDeposit.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory EligibleDeposit.fromJson(Map<String, dynamic> json) => EligibleDeposit(
        amountFils: json["amountFils"],
        currency: currencyValues.map[json["currency"]]!,
    );

    Map<String, dynamic> toJson() => {
        "amountFils": amountFils,
        "currency": currencyValues.reverse[currency],
    };
}

enum ReasonCode {
    ACCOUNT_RESTRICTED,
    DEPOSIT_INSUFFICIENT,
    DEPOSIT_REQUIRED,
    KYC_PENDING,
    KYC_REQUIRED,
    TERMS_ACCEPTANCE_REQUIRED
}

final reasonCodeValues = EnumValues({
    "ACCOUNT_RESTRICTED": ReasonCode.ACCOUNT_RESTRICTED,
    "DEPOSIT_INSUFFICIENT": ReasonCode.DEPOSIT_INSUFFICIENT,
    "DEPOSIT_REQUIRED": ReasonCode.DEPOSIT_REQUIRED,
    "KYC_PENDING": ReasonCode.KYC_PENDING,
    "KYC_REQUIRED": ReasonCode.KYC_REQUIRED,
    "TERMS_ACCEPTANCE_REQUIRED": ReasonCode.TERMS_ACCEPTANCE_REQUIRED
});

class RequiredDeposit {
    int amountFils;
    Currency currency;

    RequiredDeposit({
        required this.amountFils,
        required this.currency,
    });

    factory RequiredDeposit.fromRawJson(String str) => RequiredDeposit.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory RequiredDeposit.fromJson(Map<String, dynamic> json) => RequiredDeposit(
        amountFils: json["amountFils"],
        currency: currencyValues.map[json["currency"]]!,
    );

    Map<String, dynamic> toJson() => {
        "amountFils": amountFils,
        "currency": currencyValues.reverse[currency],
    };
}

class MyHighestVisibleBid {
    int amountFils;
    Currency currency;

    MyHighestVisibleBid({
        required this.amountFils,
        required this.currency,
    });

    factory MyHighestVisibleBid.fromRawJson(String str) => MyHighestVisibleBid.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory MyHighestVisibleBid.fromJson(Map<String, dynamic> json) => MyHighestVisibleBid(
        amountFils: json["amountFils"],
        currency: currencyValues.map[json["currency"]]!,
    );

    Map<String, dynamic> toJson() => {
        "amountFils": amountFils,
        "currency": currencyValues.reverse[currency],
    };
}

enum MyBidStateStatus {
    LOST,
    NOT_BIDDING,
    OUTBID,
    WINNING,
    WON,
    WON_PENDING_APPROVAL
}

final myBidStateStatusValues = EnumValues({
    "LOST": MyBidStateStatus.LOST,
    "NOT_BIDDING": MyBidStateStatus.NOT_BIDDING,
    "OUTBID": MyBidStateStatus.OUTBID,
    "WINNING": MyBidStateStatus.WINNING,
    "WON": MyBidStateStatus.WON,
    "WON_PENDING_APPROVAL": MyBidStateStatus.WON_PENDING_APPROVAL
});

class State {
    int? approximateViewerCount;
    int bidCount;
    DateTime closesAt;
    StateCurrentBid? currentBid;
    Lifecycle lifecycle;
    StateNextMinimumBid nextMinimumBid;
    ReserveStatus reserveStatus;
    SoftClose softClose;
    DateTime startsAt;

    State({
        this.approximateViewerCount,
        required this.bidCount,
        required this.closesAt,
        required this.currentBid,
        required this.lifecycle,
        required this.nextMinimumBid,
        required this.reserveStatus,
        required this.softClose,
        required this.startsAt,
    });

    factory State.fromRawJson(String str) => State.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory State.fromJson(Map<String, dynamic> json) => State(
        approximateViewerCount: json["approximateViewerCount"],
        bidCount: json["bidCount"],
        closesAt: DateTime.parse(json["closesAt"]),
        currentBid: json["currentBid"] == null ? null : StateCurrentBid.fromJson(json["currentBid"]),
        lifecycle: lifecycleValues.map[json["lifecycle"]]!,
        nextMinimumBid: StateNextMinimumBid.fromJson(json["nextMinimumBid"]),
        reserveStatus: reserveStatusValues.map[json["reserveStatus"]]!,
        softClose: SoftClose.fromJson(json["softClose"]),
        startsAt: DateTime.parse(json["startsAt"]),
    );

    Map<String, dynamic> toJson() => {
        "approximateViewerCount": approximateViewerCount,
        "bidCount": bidCount,
        "closesAt": closesAt.toIso8601String(),
        "currentBid": currentBid?.toJson(),
        "lifecycle": lifecycleValues.reverse[lifecycle],
        "nextMinimumBid": nextMinimumBid.toJson(),
        "reserveStatus": reserveStatusValues.reverse[reserveStatus],
        "softClose": softClose.toJson(),
        "startsAt": startsAt.toIso8601String(),
    };
}

class StateCurrentBid {
    int amountFils;
    Currency currency;

    StateCurrentBid({
        required this.amountFils,
        required this.currency,
    });

    factory StateCurrentBid.fromRawJson(String str) => StateCurrentBid.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory StateCurrentBid.fromJson(Map<String, dynamic> json) => StateCurrentBid(
        amountFils: json["amountFils"],
        currency: currencyValues.map[json["currency"]]!,
    );

    Map<String, dynamic> toJson() => {
        "amountFils": amountFils,
        "currency": currencyValues.reverse[currency],
    };
}

enum Lifecycle {
    APPROVED,
    CANCELLED,
    CLOSED,
    LIVE,
    PAUSED,
    PENDING_APPROVAL,
    REJECTED,
    SCHEDULED
}

final lifecycleValues = EnumValues({
    "APPROVED": Lifecycle.APPROVED,
    "CANCELLED": Lifecycle.CANCELLED,
    "CLOSED": Lifecycle.CLOSED,
    "LIVE": Lifecycle.LIVE,
    "PAUSED": Lifecycle.PAUSED,
    "PENDING_APPROVAL": Lifecycle.PENDING_APPROVAL,
    "REJECTED": Lifecycle.REJECTED,
    "SCHEDULED": Lifecycle.SCHEDULED
});

class StateNextMinimumBid {
    int amountFils;
    Currency currency;

    StateNextMinimumBid({
        required this.amountFils,
        required this.currency,
    });

    factory StateNextMinimumBid.fromRawJson(String str) => StateNextMinimumBid.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory StateNextMinimumBid.fromJson(Map<String, dynamic> json) => StateNextMinimumBid(
        amountFils: json["amountFils"],
        currency: currencyValues.map[json["currency"]]!,
    );

    Map<String, dynamic> toJson() => {
        "amountFils": amountFils,
        "currency": currencyValues.reverse[currency],
    };
}

class SoftClose {
    bool enabled;
    int extensionCount;
    int extensionMs;
    int windowMs;

    SoftClose({
        required this.enabled,
        required this.extensionCount,
        required this.extensionMs,
        required this.windowMs,
    });

    factory SoftClose.fromRawJson(String str) => SoftClose.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory SoftClose.fromJson(Map<String, dynamic> json) => SoftClose(
        enabled: json["enabled"],
        extensionCount: json["extensionCount"],
        extensionMs: json["extensionMs"],
        windowMs: json["windowMs"],
    );

    Map<String, dynamic> toJson() => {
        "enabled": enabled,
        "extensionCount": extensionCount,
        "extensionMs": extensionMs,
        "windowMs": windowMs,
    };
}

class Money {
    int amountFils;
    Currency currency;

    Money({
        required this.amountFils,
        required this.currency,
    });

    factory Money.fromRawJson(String str) => Money.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory Money.fromJson(Map<String, dynamic> json) => Money(
        amountFils: json["amountFils"],
        currency: currencyValues.map[json["currency"]]!,
    );

    Map<String, dynamic> toJson() => {
        "amountFils": amountFils,
        "currency": currencyValues.reverse[currency],
    };
}

class PlaceBidCommand {
    Amount amount;
    String commandId;
    int contractVersion;
    int expectedSequence;
    String lotId;
    DateTime sentAt;
    String termsVersionId;

    PlaceBidCommand({
        required this.amount,
        required this.commandId,
        required this.contractVersion,
        required this.expectedSequence,
        required this.lotId,
        required this.sentAt,
        required this.termsVersionId,
    });

    factory PlaceBidCommand.fromRawJson(String str) => PlaceBidCommand.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory PlaceBidCommand.fromJson(Map<String, dynamic> json) => PlaceBidCommand(
        amount: Amount.fromJson(json["amount"]),
        commandId: json["commandId"],
        contractVersion: json["contractVersion"],
        expectedSequence: json["expectedSequence"],
        lotId: json["lotId"],
        sentAt: DateTime.parse(json["sentAt"]),
        termsVersionId: json["termsVersionId"],
    );

    Map<String, dynamic> toJson() => {
        "amount": amount.toJson(),
        "commandId": commandId,
        "contractVersion": contractVersion,
        "expectedSequence": expectedSequence,
        "lotId": lotId,
        "sentAt": sentAt.toIso8601String(),
        "termsVersionId": termsVersionId,
    };
}

class Amount {
    int amountFils;
    Currency currency;

    Amount({
        required this.amountFils,
        required this.currency,
    });

    factory Amount.fromRawJson(String str) => Amount.fromJson(json.decode(str));

    String toRawJson() => json.encode(toJson());

    factory Amount.fromJson(Map<String, dynamic> json) => Amount(
        amountFils: json["amountFils"],
        currency: currencyValues.map[json["currency"]]!,
    );

    Map<String, dynamic> toJson() => {
        "amountFils": amountFils,
        "currency": currencyValues.reverse[currency],
    };
}

class EnumValues<T> {
    Map<String, T> map;
    late Map<T, String> reverseMap;

    EnumValues(this.map);

    Map<T, String> get reverse {
            reverseMap = map.map((k, v) => MapEntry(v, k));
            return reverseMap;
    }
}
