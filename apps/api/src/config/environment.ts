import { z } from "zod";

const rawEnvironmentSchema = z.object({
  ADMIN_BASE_URL: z.url().optional(),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z.url().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  READINESS_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(30_000)
    .default(2_000),
  REDIS_URL: z.url().optional(),
  WEB_BASE_URL: z.url().optional(),
});

export interface Environment {
  readonly adminBaseUrl: string;
  readonly apiPort: number;
  readonly databaseUrl: string;
  readonly logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  readonly nodeEnv: "development" | "test" | "production";
  readonly readinessTimeoutMs: number;
  readonly redisUrl: string;
  readonly webBaseUrl: string;
}

export function readEnvironment(
  input: NodeJS.ProcessEnv = process.env,
): Environment {
  const raw = rawEnvironmentSchema.parse(input);
  const isProduction = raw.NODE_ENV === "production";

  const databaseUrl = requireInProduction(
    "DATABASE_URL",
    raw.DATABASE_URL,
    "postgresql://pioneer:pioneer@localhost:5432/pioneer",
    isProduction,
  );
  const redisUrl = requireInProduction(
    "REDIS_URL",
    raw.REDIS_URL,
    "redis://localhost:6379",
    isProduction,
  );
  const webBaseUrl = requireInProduction(
    "WEB_BASE_URL",
    raw.WEB_BASE_URL,
    "http://localhost:3000",
    isProduction,
  );
  const adminBaseUrl = requireInProduction(
    "ADMIN_BASE_URL",
    raw.ADMIN_BASE_URL,
    "http://localhost:3001",
    isProduction,
  );

  return {
    adminBaseUrl,
    apiPort: raw.API_PORT,
    databaseUrl,
    logLevel: raw.LOG_LEVEL,
    nodeEnv: raw.NODE_ENV,
    readinessTimeoutMs: raw.READINESS_TIMEOUT_MS,
    redisUrl,
    webBaseUrl,
  };
}

function requireInProduction(
  name: string,
  value: string | undefined,
  localDefault: string,
  isProduction: boolean,
): string {
  if (value !== undefined) {
    return value;
  }

  if (isProduction) {
    throw new Error(`${name} is required in production`);
  }

  return localDefault;
}
