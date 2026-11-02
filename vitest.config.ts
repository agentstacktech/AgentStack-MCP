import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Tests never hit the network unless AGENTSTACK_LIVE=1 (see test/live.test.ts).
    testTimeout: 30_000,
  },
});
