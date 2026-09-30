import { defineConfig } from "vitest/config";

// Performance and load tests: slow, so kept out of `npm run test`, coverage and CI.
// Run on demand with `npm run test:perf`.
export default defineConfig({
  test: {
    include: ["test/perf/**/*.test.ts"],
    setupFiles: ["test/setup/no-network.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
