import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/release/**/*.test.ts"],
    setupFiles: ["test/setup/no-network.ts"],
  },
});
