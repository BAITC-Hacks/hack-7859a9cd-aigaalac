import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// MapLibre v6 uses a separate ES module worker. Serve its matching worker and
// shared module locally so Next.js bundling cannot break their relative URLs.
const source = dirname(
  fileURLToPath(import.meta.resolve("maplibre-gl/package.json")),
);
const destination = fileURLToPath(
  new URL("../public/maplibre/", import.meta.url),
);
await mkdir(destination, { recursive: true });
await Promise.all([
  ...["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"].map((file) =>
    copyFile(join(source, "dist", file), join(destination, file)),
  ),
  copyFile(join(source, "LICENSE.txt"), join(destination, "LICENSE.txt")),
]);
