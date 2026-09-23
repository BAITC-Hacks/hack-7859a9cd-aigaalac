import type { Map } from "maplibre-gl";

export const BUILDING_LAYER = "akim-3d-buildings";

export function addCityLayers(map: Map, dark: boolean) {
  if (map.getLayer(BUILDING_LAYER)) return;
  // OpenFreeMap uses the OpenMapTiles schema: real footprints and recorded heights.
  if (!map.getSource("akim-buildings")) {
    map.addSource("akim-buildings", {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    });
  }
  // Some styles place water labels before roads. Insert after every ground
  // layer so later road/fill layers cannot paint across the 3D buildings.
  const layers = map.getStyle().layers;
  const lastGroundIndex = layers.findLastIndex(
    (layer) => layer.type !== "symbol",
  );
  const labelLayer = layers
    .slice(lastGroundIndex + 1)
    .find((layer) => layer.type === "symbol");
  map.addLayer(
    {
      id: BUILDING_LAYER,
      type: "fill-extrusion",
      source: "akim-buildings",
      "source-layer": "building",
      minzoom: 13,
      filter: ["!=", ["get", "hide_3d"], true],
      paint: {
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "render_height"], 0],
          0,
          dark ? "#345567" : "#b6cfca",
          50,
          dark ? "#498f99" : "#75aea3",
          140,
          dark ? "#7ce1cb" : "#258c7c",
        ],
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 0],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.94,
      },
    },
    labelLayer?.id,
  );
}
