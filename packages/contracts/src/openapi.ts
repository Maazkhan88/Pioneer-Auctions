import { z } from "zod";

import { LotPublicStateSchema } from "./auction.js";
import {
  BidCommandAckSchema,
  BidLatestStateSchema,
  PlaceBidRestRequestSchema,
  SetProxyBidRestRequestSchema,
} from "./commands.js";
import { ApiErrorSchema, MoneySchema, UuidSchema } from "./core.js";
import { LotSnapshotSchema } from "./events.js";
import { restOperations, type RestOperation } from "./rest.js";

export const OPENAPI_PATH = "/api/v1/openapi.json";

const componentSchemas = {
  ApiError: ApiErrorSchema,
  BidCommandAck: BidCommandAckSchema,
  BidLatestState: BidLatestStateSchema,
  LotPublicState: LotPublicStateSchema,
  LotSnapshot: LotSnapshotSchema,
  Money: MoneySchema,
  PlaceBidRestRequest: PlaceBidRestRequestSchema,
  SetProxyBidRestRequest: SetProxyBidRestRequestSchema,
  Uuid: UuidSchema,
} as const;

export function createOpenApiDocument(): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const operation of restOperations) {
    const path = (paths[operation.path] ??= {});
    path[operation.method] = createOperation(operation);
  }

  return {
    components: {
      schemas: Object.fromEntries(
        Object.entries(componentSchemas).map(([name, schema]) => [
          name,
          z.toJSONSchema(schema, { target: "draft-2020-12" }),
        ]),
      ),
    },
    info: {
      title: "Pioneer Auctions API",
      version: "1.0.0",
    },
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    openapi: "3.1.0",
    paths,
    servers: [{ url: "/api/v1" }],
    "x-contract-version": 1,
  };
}

function createOperation(operation: RestOperation): Record<string, unknown> {
  const parameters = [...operation.path.matchAll(/\{(?<name>[^}]+)\}/g)].map(
    (match) => ({
      in: "path",
      name: match.groups?.name ?? "id",
      required: true,
      schema: { $ref: "#/components/schemas/Uuid" },
    }),
  );

  const base = {
    operationId: operationId(operation),
    parameters,
    summary: operation.summary,
    tags: [operation.path.split("/").filter(Boolean)[0] ?? "root"],
    "x-implementation-status": operation.status,
  };

  if (operation.method === "post" && operation.path === "/lots/{lotId}/bids") {
    return {
      ...base,
      requestBody: jsonBody("PlaceBidRestRequest"),
      responses: commandResponses(),
    };
  }

  if (
    operation.method === "put" &&
    operation.path === "/lots/{lotId}/proxy-bid"
  ) {
    return {
      ...base,
      requestBody: jsonBody("SetProxyBidRestRequest"),
      responses: commandResponses(),
    };
  }

  if (
    operation.method === "get" &&
    operation.path === "/lots/{lotId}/snapshot"
  ) {
    return {
      ...base,
      responses: {
        "200": jsonResponse("Authoritative snapshot", "LotSnapshot"),
        "4XX": jsonResponse("Client error", "ApiError"),
      },
    };
  }

  return {
    ...base,
    responses: {
      "501": {
        description: "Contract inventory entry; implementation is planned",
      },
    },
  };
}

function commandResponses(): Record<string, unknown> {
  return {
    "200": jsonResponse(
      "Replay of an existing command result",
      "BidCommandAck",
    ),
    "201": jsonResponse("Command evaluated", "BidCommandAck"),
    "4XX": jsonResponse(
      "Authentication, authorization, or validation error",
      "ApiError",
    ),
  };
}

function jsonBody(schemaName: string): Record<string, unknown> {
  return {
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
    required: true,
  };
}

function jsonResponse(
  description: string,
  schemaName: string,
): Record<string, unknown> {
  return {
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
    description,
  };
}

function operationId(operation: RestOperation): string {
  const normalized = operation.path
    .replaceAll(/[{}]/g, "")
    .split("/")
    .filter(Boolean)
    .map((segment, index) =>
      index === 0 ? segment : segment[0]?.toUpperCase() + segment.slice(1),
    )
    .join("")
    .replaceAll("-", "_");
  return `${operation.method}_${normalized}`;
}
