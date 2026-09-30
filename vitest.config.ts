import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/release/**", "test/e2e/**", "test/perf/**", "node_modules/**"],
    setupFiles: ["test/setup/no-network.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text-summary", "html", "lcov"],
      // Just below the measured values (spec 005 FR-016); raise them as coverage grows.
      thresholds: { statements: 94, branches: 86, functions: 90, lines: 95 },
    },
  },
});
