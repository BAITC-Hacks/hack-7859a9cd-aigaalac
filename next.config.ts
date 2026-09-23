import type { NextConfig } from "next";
const config: NextConfig = {
  // Separate build directories let browser tests exercise mock and real API modes.
  distDir: process.env.NEXT_TEST_DIST_DIR || ".next",
  webpack(config) {
    // Browser tests use isolated builds; retain only an in-memory cache so
    // multiple test servers do not accumulate large disposable disk caches.
    if (process.env.NEXT_TEST_DIST_DIR) config.cache = { type: "memory" };
    return config;
  },
};
export default config;
