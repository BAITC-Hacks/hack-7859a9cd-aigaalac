/** Schematic land allocation: every point on either bank belongs to one district. */
export interface CityRect { minX: number; maxX: number; minZ: number; maxZ: number }
export interface DistrictLayout {
  id: string;
  bounds: CityRect;
  hub: readonly [number, number];
  ground: string;
}
export interface CityStreet { x: number; z: number; length: number; vertical: boolean; width: number }
export const DISTRICT_LAYOUTS: readonly DistrictLayout[] = [
  { id: "saryarka", bounds: { minX: -40.8, maxX: -13.6, minZ: -31.8, maxZ: -2.1 }, hub: [-27.2, -14], ground: "#c6c5a9" },
  { id: "baikonur", bounds: { minX: -13.6, maxX: 13.6, minZ: -31.8, maxZ: -2.1 }, hub: [0, -14], ground: "#bbc9bd" },
  { id: "almaty", bounds: { minX: 13.6, maxX: 40.8, minZ: -31.8, maxZ: -2.1 }, hub: [27.2, -14], ground: "#b6c5a4" },
  { id: "esil", bounds: { minX: -40.8, maxX: 0, minZ: 2.1, maxZ: 31.8 }, hub: [-20.4, 14], ground: "#b6c9c5" },
  { id: "nura", bounds: { minX: 0, maxX: 40.8, minZ: 2.1, maxZ: 31.8 }, hub: [20.4, 14], ground: "#c9c5a6" },
];
export const DISTRICT_POSITIONS: Record<string, readonly [number, number]> = Object.fromEntries(DISTRICT_LAYOUTS.map(layout => [layout.id, layout.hub]));
export const CITY_STREETS: CityStreet[] = [];
for (const z of [-29.5, -13.77, -7.5, 7.5, 14.23, 29.5]) CITY_STREETS.push({ x: 0, z, length: 79, vertical: false, width: 1.5 });
for (const z of [-3.15, 3.15]) CITY_STREETS.push({ x: 0, z, length: 80, vertical: false, width: 1.05 });
for (const side of [-1, 1]) {
  for (const x of [-39.5, 39.5]) CITY_STREETS.push({ x, z: side * 16.3, length: 26.4, vertical: true, width: 1.5 });
  for (const x of [-28, -8, 8, 28]) CITY_STREETS.push({ x, z: side * 4.8, length: 5.4, vertical: true, width: 1.2 });
}
for (const x of [-13.6, 13.6]) CITY_STREETS.push({ x, z: -16.3, length: 28.5, vertical: true, width: 1.5 });
CITY_STREETS.push({ x: 0, z: 18.5, length: 22, vertical: true, width: 1.5 });
for (const layout of DISTRICT_LAYOUTS) {
  const [x, z] = layout.hub;
  const side = Math.sign(z);
  for (const offset of [-7.3, 7.3]) CITY_STREETS.push({ x: x + offset, z: side * 18.5, length: 22, vertical: true, width: 1.1 });
  CITY_STREETS.push({ x, z: side * 8.4, length: 1.8, vertical: true, width: 1.12 });
}
export function streetBounds(street: CityStreet): CityRect {
  const halfWidth = (street.width + .75) / 2;
  return { minX: street.x - (street.vertical ? halfWidth : street.length / 2), maxX: street.x + (street.vertical ? halfWidth : street.length / 2), minZ: street.z - (street.vertical ? street.length / 2 : halfWidth), maxZ: street.z + (street.vertical ? street.length / 2 : halfWidth) };
}
export function overlaps(a: CityRect, b: CityRect): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}
export function districtAt(x: number, z: number): string | null {
  return DISTRICT_LAYOUTS.find(({ bounds: b }) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ)?.id ?? null;
}
export function reservedDistrictLand(layout: DistrictLayout): CityRect[] {
  const [x, z] = layout.hub;
  const plazaZ = z + Math.sign(z) * 7.7;
  return [
    { minX: x - 6.5, maxX: x + 6.5, minZ: z - 5.9, maxZ: z + 5.9 },
    { minX: x - 4.4, maxX: x + 4.4, minZ: plazaZ - 2.7, maxZ: plazaZ + 2.7 },
  ];
}
export interface CityParcel { districtId: string; x: number; z: number; garden: boolean }
export function createCityParcels(): CityParcel[] {
  const reserved = [...CITY_STREETS.map(streetBounds), ...DISTRICT_LAYOUTS.flatMap(reservedDistrictLand), { minX: -2.2, maxX: 2.2, minZ: 2.1, maxZ: 6.7 }];
  const parcels: CityParcel[] = [];
  for (const layout of DISTRICT_LAYOUTS) {
    const b = layout.bounds;
    for (const [offsetX, offsetZ] of [[0, 0], [.975, 0], [0, .975], [.975, .975]])
    for (let x = b.minX + 1.15 + offsetX; x <= b.maxX - 1.15; x += 1.95) for (let z = b.minZ + 1.15 + offsetZ; z <= b.maxZ - 1.15; z += 1.95) {
      const footprint = { minX: x - .82, maxX: x + .82, minZ: z - .82, maxZ: z + .82 };
      if (reserved.some(rect => overlaps(footprint, rect))) continue;
      parcels.push({ districtId: layout.id, x, z, garden: parcels.length % 9 === 4 });
      reserved.push({ minX: x - .93, maxX: x + .93, minZ: z - .93, maxZ: z + .93 });
    }
  }
  return parcels;
}
