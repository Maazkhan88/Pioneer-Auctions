import type {
  BidCommandResult,
  BidLatestState,
  LotSubscribeCommand,
  LotSyncCommand,
  LotUnsubscribeCommand,
  PlaceBidCommand,
  PresenceUpdateCommand,
  SetProxyBidCommand,
} from "./commands.js";
import type { CommandAck } from "./core.js";
import type {
  ApprovalChangedEvent,
  AuctionExtendedEvent,
  AuctionStateChangedEvent,
  BidAcceptedEvent,
  DepositChangedEvent,
  EligibilityChangedEvent,
  LotPresenceChangedEvent,
  LotSnapshot,
  MyBidStatusChangedEvent,
  NotificationCreatedEvent,
  OfferChangedEvent,
  PaymentChangedEvent,
  ProxyBidChangedEvent,
  ReserveStatusChangedEvent,
  ServerHello,
} from "./events.js";

export interface ClientToServerEvents {
  "bid:place": (
    command: PlaceBidCommand,
    acknowledge: (ack: CommandAck<BidCommandResult, BidLatestState>) => void,
  ) => void;
  "lot:subscribe": (
    command: LotSubscribeCommand,
    acknowledge: (ack: CommandAck<LotSnapshot>) => void,
  ) => void;
  "lot:sync": (
    command: LotSyncCommand,
    acknowledge: (ack: CommandAck<LotSnapshot>) => void,
  ) => void;
  "lot:unsubscribe": (
    command: LotUnsubscribeCommand,
    acknowledge: (ack: CommandAck<{ readonly subscribed: false }>) => void,
  ) => void;
  "presence:update": (
    command: PresenceUpdateCommand,
    acknowledge: (ack: CommandAck<{ readonly recorded: true }>) => void,
  ) => void;
  "proxy-bid:set": (
    command: SetProxyBidCommand,
    acknowledge: (ack: CommandAck<BidCommandResult, BidLatestState>) => void,
  ) => void;
}

export interface ServerToClientEvents {
  "approval:changed": (event: ApprovalChangedEvent) => void;
  "auction:extended": (event: AuctionExtendedEvent) => void;
  "auction:state-changed": (event: AuctionStateChangedEvent) => void;
  "bid:accepted": (event: BidAcceptedEvent) => void;
  "bid:status-changed": (event: MyBidStatusChangedEvent) => void;
  "deposit:changed": (event: DepositChangedEvent) => void;
  "eligibility:changed": (event: EligibilityChangedEvent) => void;
  "lot:presence-changed": (event: LotPresenceChangedEvent) => void;
  "lot:snapshot": (event: LotSnapshot) => void;
  "notification:created": (event: NotificationCreatedEvent) => void;
  "offer:changed": (event: OfferChangedEvent) => void;
  "payment:changed": (event: PaymentChangedEvent) => void;
  "proxy-bid:changed": (event: ProxyBidChangedEvent) => void;
  "reserve:status-changed": (event: ReserveStatusChangedEvent) => void;
  "server:hello": (event: ServerHello) => void;
}
