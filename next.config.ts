import type { NextConfig } from "next";
const config: NextConfig = {
  // Separate build directories let browser tests exercise mock and real API modes.
  distDir: process.env.NEXT_TEST_DIST_DIR || ".next",
};
export default config;
