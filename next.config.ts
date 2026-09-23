import type { NextConfig } from "next";
const config: NextConfig = {
  // Separate build directories let browser tests exercise preview and live AI modes.
  distDir: process.env.NEXT_TEST_DIST_DIR || ".next",
};
export default config;
