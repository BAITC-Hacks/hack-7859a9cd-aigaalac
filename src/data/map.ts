// Approximate demo focus points for the simulator's five districts, NOT boundaries.
// Replace with authoritative district centroids/GeoJSON when provided by the backend.
export const districtLocations: Record<
  string,
  { center: [number, number]; color: string }
> = {
  esil: { center: [71.4305, 51.1282], color: "#28bda0" },
  almaty: { center: [71.478, 51.155], color: "#a78bfa" },
  saryarka: { center: [71.397, 51.184], color: "#f2ad65" },
  baikonur: { center: [71.449, 51.183], color: "#60a5fa" },
  nura: { center: [71.4025, 51.1305], color: "#ec8dba" },
};
export const ASTANA_CAMERA = {
  center: [71.429, 51.1285] as [number, number],
  zoom: 15.2,
  pitch: 58,
  bearing: -28,
};
export const MAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
