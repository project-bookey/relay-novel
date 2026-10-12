import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "*.spec.ts",
  use: {
    baseURL: process.env.PREVIEW_URL || "http://localhost:8083",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    launchOptions: { channel: "chrome" },
    screenshot: "only-on-failure",
  },
});
