import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/release/**", "node_modules/**"],
    setupFiles: ["test/setup/no-network.ts"],
  },
});
