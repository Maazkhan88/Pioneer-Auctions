import { baseVitestConfig } from "@pioneer/config/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  ...baseVitestConfig,
  test: {
    ...baseVitestConfig.test,
    environment: "node",
  },
});
