import assert from "node:assert/strict";
import test from "node:test";
import { CITY_STREETS, DISTRICT_LAYOUTS, createCityParcels, districtAt, overlaps, reservedDistrictLand, streetBounds } from "../lib/city-layout.ts";

test("five large districts cover both banks completely without overlapping", () => {
  for (const [index, layout] of DISTRICT_LAYOUTS.entries()) {
    const b = layout.bounds;
    assert.ok((b.maxX - b.minX) * (b.maxZ - b.minZ) > 800);
    for (const other of DISTRICT_LAYOUTS.slice(index + 1)) assert.equal(overlaps(b, other.bounds), false);
    for (const r of reservedDistrictLand(layout)) {
      assert.ok(r.minX >= b.minX && r.maxX <= b.maxX && r.minZ >= b.minZ && r.maxZ <= b.maxZ);
    }
  }
  for (let x = -40.7; x < 40.8; x += .5) for (let z = -31.7; z < 31.8; z += .5) {
    if (Math.abs(z) < 2.1) assert.equal(districtAt(x, z), null);
    else assert.ok(districtAt(x, z), `Unallocated land at ${x}, ${z}`);
  }
});

test("permanent neighbourhoods stay in their districts and clear of streets and project hubs", () => {
  const parcels = createCityParcels();
  assert.deepEqual(parcels, createCityParcels());
  assert.ok(parcels.filter(parcel => !parcel.garden).length > 200);
  const reserved = [...CITY_STREETS.map(streetBounds), ...DISTRICT_LAYOUTS.flatMap(reservedDistrictLand)];
  for (const [index, parcel] of parcels.entries()) {
    assert.equal(districtAt(parcel.x, parcel.z), parcel.districtId);
    const footprint = { minX: parcel.x - .82, maxX: parcel.x + .82, minZ: parcel.z - .82, maxZ: parcel.z + .82 };
    assert.ok(reserved.every(rect => !overlaps(footprint, rect)));
    for (const other of parcels.slice(index + 1)) assert.equal(overlaps(footprint, { minX: other.x - .82, maxX: other.x + .82, minZ: other.z - .82, maxZ: other.z + .82 }), false);
  }
  for (const layout of DISTRICT_LAYOUTS) assert.ok(parcels.filter(parcel => parcel.districtId === layout.id).length >= 20);
});
