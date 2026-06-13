import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["unit-tests/**/*.{test,spec}.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "./unit-tests/setup.ts")],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
