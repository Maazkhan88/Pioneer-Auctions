import { Inject } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { OnGatewayConnection } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { ZodError } from "zod";

import { SessionService } from "../identity/session.service.js";
import {
  parseLotSubscribeInput,
  parseLotSyncInput,
  parseSocketPlaceBidCommand,
  parseSocketSetProxyBidCommand,
  type LotSnapshot,
  type PlaceBidAck,
  type SetProxyBidAck,
} from "./bid.dto.js";
import { BiddingService } from "./bidding.service.js";

interface SocketAck<T> {
  readonly contractVersion: 1;
  readonly commandId: string;
  readonly status: "ACCEPTED" | "REJECTED";
  readonly correlationId: string;
  readonly serverTime: string;
  readonly result?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly retryable: boolean;
  };
}

type AuthenticatedSocket = Socket & {
  data: {
    accountId?: string;
  };
};

@WebSocketGateway({
  cors: { credentials: true, origin: true },
  namespace: "/auctions/v1",
})
export class BiddingGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    @Inject(BiddingService)
    private readonly bidding: BiddingService,
    @Inject(SessionService)
    private readonly session: SessionService,
  ) {}

  handleConnection(socket: AuthenticatedSocket): void {
    const accountId = socket.handshake.auth["testAccountId"];
    if (typeof accountId === "string" && accountId.length > 0) {
      socket.data.accountId = accountId;
      void socket.join(`user:${accountId}`);
    }

    socket.emit("server:hello", {
      connectionId: socket.id,
      contractVersion: 1,
      heartbeatIntervalMs: 25_000,
      maxCommandSkewSequence: 250,
      serverTime: new Date().toISOString(),
    });
  }

  @SubscribeMessage("lot:subscribe")
  async subscribeToLot(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<SocketAck<LotSnapshot>> {
    try {
      const input = parseLotSubscribeInput(body);
      await socket.join(`lot:${input.lotId}`);
      return await this.snapshotAck(input.commandId, input.lotId);
    } catch (error) {
      return genericCommandError(error, commandIdFrom(body));
    }
  }

  @SubscribeMessage("lot:sync")
  async syncLot(@MessageBody() body: unknown): Promise<SocketAck<LotSnapshot>> {
    try {
      const input = parseLotSyncInput(body);
      return await this.snapshotAck(input.commandId, input.lotId);
    } catch (error) {
      return genericCommandError(error, commandIdFrom(body));
    }
  }

  @SubscribeMessage("lot:unsubscribe")
  async unsubscribeFromLot(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<SocketAck<{ readonly lotId: string }>> {
    try {
      const input = parseLotSubscribeInput(body);
      await socket.leave(`lot:${input.lotId}`);
      return acceptedAck(input.commandId, { lotId: input.lotId });
    } catch (error) {
      return genericCommandError(error, commandIdFrom(body));
    }
  }

  @SubscribeMessage("bid:place")
  async placeBid(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: unknown,
  ): Promise<PlaceBidAck> {
    try {
      const input = parseSocketPlaceBidCommand(body);
      const account = await this.session.requireAccountId(
        socket.data.accountId,
      );
      return await this.bidding.placeManualBid({
        accountId: account.id,
        commandId: input.commandId,
        correlationId: socketCorrelationId(socket),
        input,
        lotId: input.lotId,
      });
    } catch (error) {
      return bidCommandError(error, commandIdFrom(body));
    }
  }

  @SubscribeMessage("proxy-bid:set")
  async setProxyBid(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: unknown,
  ): Promise<SetProxyBidAck> {
    try {
      const input = parseSocketSetProxyBidCommand(body);
      const account = await this.session.requireAccountId(
        socket.data.accountId,
      );
      return await this.bidding.setProxyBid({
        accountId: account.id,
        commandId: input.commandId,
        correlationId: socketCorrelationId(socket),
        input,
        lotId: input.lotId,
      });
    } catch (error) {
      return bidCommandError(error, commandIdFrom(body));
    }
  }

  private async snapshotAck(
    commandId: string,
    lotId: string,
  ): Promise<SocketAck<LotSnapshot>> {
    const snapshot = await this.bidding.getLotSnapshot(lotId);
    if (snapshot === null) {
      return {
        commandId,
        contractVersion: 1,
        correlationId: "socket",
        error: {
          code: "LOT_NOT_FOUND",
          message: "LOT_NOT_FOUND",
          retryable: false,
        },
        serverTime: new Date().toISOString(),
        status: "REJECTED",
      };
    }
    return acceptedAck(commandId, snapshot);
  }
}

function acceptedAck<T>(commandId: string, result: T): SocketAck<T> {
  return {
    commandId,
    contractVersion: 1,
    correlationId: "socket",
    result,
    serverTime: new Date().toISOString(),
    status: "ACCEPTED",
  };
}

function genericCommandError<T>(
  error: unknown,
  commandId: string,
): SocketAck<T> {
  const code =
    error instanceof ZodError ? "VALIDATION_FAILED" : "AUTH_REQUIRED";
  return {
    commandId,
    contractVersion: 1,
    correlationId: "socket",
    error: {
      code,
      message: code,
      retryable: false,
    },
    serverTime: new Date().toISOString(),
    status: "REJECTED",
  };
}

function bidCommandError(
  error: unknown,
  commandId: string,
): Extract<PlaceBidAck, { status: "REJECTED" }> {
  const code =
    error instanceof ZodError ? "VALIDATION_FAILED" : "AUTH_REQUIRED";
  return {
    commandId,
    contractVersion: 1,
    correlationId: "socket",
    error: {
      code,
      message: code,
      retryable: false,
    },
    serverTime: new Date().toISOString(),
    status: "REJECTED",
  };
}

function commandIdFrom(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "commandId" in body &&
    typeof body.commandId === "string"
  ) {
    return body.commandId;
  }
  return "00000000-0000-4000-8000-000000000000";
}

function socketCorrelationId(socket: Socket): string {
  const header = socket.handshake.headers["x-correlation-id"];
  return typeof header === "string" ? header : "socket";
}
