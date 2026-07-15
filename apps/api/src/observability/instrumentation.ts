import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: process.env.OTEL_SERVICE_NAME ?? "pioneer-api",
});

sdk.start();

process.once("SIGTERM", () => {
  void sdk.shutdown();
});
