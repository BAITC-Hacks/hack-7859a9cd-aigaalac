import * as THREE from "three";
import type { DistrictLandmarkKind } from "./district-identities";

const P = {
  ivory: "#f4efdb", stone: "#d7d0b5", warm: "#e4d0ac", gold: "#d7b261",
  teal: "#4d9296", glass: "#4b8c9b", blue: "#428bb0", deep: "#265c6a",
  red: "#b36f59", dark: "#395653", silver: "#c4d5d3", green: "#9bb28d",
};

/** Permanent, schematic architectural miniatures. No asset fetches or score logic. */
export function createDistrictLandmark(kind: DistrictLandmarkKind): THREE.Group {
  const group = new THREE.Group();
  group.name = `district-landmark:${kind}`;
  group.userData = { kind, permanent: true };
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
  const sphereGeometry = new THREE.SphereGeometry(1, 24, 16);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  function material(color: string, metalness = .02, roughness = .72) {
    const key = `${color}:${metalness}:${roughness}`;
    let result = materials.get(key);
    if (!result) {
      result = new THREE.MeshStandardMaterial({ color, metalness, roughness });
      materials.set(key, result);
    }
    return result;
  }
  function mesh(geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, metalness = .02, roughness = .72) {
    const object = new THREE.Mesh(geometry, material(color, metalness, roughness));
    object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true;
    group.add(object);
    return object;
  }
  function box(color: string, x: number, y: number, z: number, w: number, h: number, d: number) {
    const object = mesh(boxGeometry, color, x, y, z); object.scale.set(w, h, d); return object;
  }
  function cylinder(color: string, x: number, y: number, z: number, radius: number, height: number) {
    const object = mesh(cylinderGeometry, color, x, y, z); object.scale.set(radius, height, radius); return object;
  }
  function sphere(color: string, x: number, y: number, z: number, radius: number, metalness = .02, roughness = .72) {
    const object = mesh(sphereGeometry, color, x, y, z, metalness, roughness); object.scale.setScalar(radius); return object;
  }
  function rod(color: string, a: THREE.Vector3, b: THREE.Vector3, radius = .025) {
    const direction = b.clone().sub(a);
    const object = cylinder(color, 0, 0, 0, radius, direction.length());
    object.position.copy(a).add(b).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return object;
  }
  function torus(color: string, x: number, y: number, z: number, radius: number, thickness: number, horizontal = false) {
    const object = mesh(new THREE.TorusGeometry(radius, thickness, 5, 36), color, x, y, z, .28, .5);
    if (horizontal) object.rotation.x = Math.PI / 2;
    return object;
  }
  function curve(color: string, points: THREE.Vector3[], radius = .018) {
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(12, points.length * 2), radius, 5, false), color, 0, 0, 0, .15, .5);
  }
  function plaza() {
    box("#d9d9c0", 0, .035, 0, 4.35, .07, 3.5);
    box(P.ivory, 0, .1, 0, 4.15, .08, 3.3);
  }

  if (kind === "expo") {
    plaza();
    // Nur Alem's spherical blue glass shell and its characteristic facade grid.
    const radius = 1.43, centerY = 1.94;
    cylinder(P.stone, 0, .22, -.06, 1.5, .2);
    cylinder(P.deep, 0, .43, -.06, 1.1, .32);
    sphere("#387a95", 0, centerY, -.1, radius, .46, .24);
    // A dense but deliberately legible latitude / meridian structure.
    for (let line = 1; line < 9; line++) {
      const latitude = Math.PI * line / 9;
      const ringRadius = Math.sin(latitude) * (radius + .013);
      torus("#95bdc3", 0, centerY + Math.cos(latitude) * (radius + .013), -.1, ringRadius, .014, true);
    }
    for (let longitude = 0; longitude < 16; longitude++) {
      const angle = longitude / 16 * Math.PI * 2;
      const points = Array.from({ length: 19 }, (_, i) => {
        const latitude = i / 18 * Math.PI;
        return new THREE.Vector3(
          Math.sin(latitude) * Math.cos(angle) * (radius + .023),
          centerY + Math.cos(latitude) * (radius + .023),
          -.1 + Math.sin(latitude) * Math.sin(angle) * (radius + .023),
        );
      });
      curve("#b0cbcd", points, .012);
    }
    // Low exhibition wings distinguish the sphere from a generic planet.
    for (const x of [-1.73, 1.73]) {
      box(P.ivory, x, .38, .15, .65, .48, 2.2);
      box(P.glass, x, .43, 1.264, .52, .27, .027);
      box("#d3dfda", x, .66, .15, .75, .08, 2.3);
    }
    box(P.ivory, 0, .23, 1.45, 1.8, .18, .46);
    box(P.deep, 0, .61, 1.18, .6, .59, .16);
    box(P.silver, 0, .94, 1.28, .83, .06, .5);
    for (const x of [-.46, .46]) rod(P.silver, new THREE.Vector3(x, .26, 1.48), new THREE.Vector3(x, .92, 1.48), .027);
  }

  if (kind === "khan-shatyr") {
    plaza();
    const podium = cylinder(P.stone, 0, .21, 0, 2.02, .18); podium.scale.z *= .73;
    const glassBase = cylinder(P.teal, 0, .45, 0, 1.94, .42); glassBase.scale.z *= .73;
    const peak = new THREE.Vector3(.57, 3.63, -.33);
    const steps = 9, sides = 48;
    const vertices: number[] = [], indices: number[] = [];
    const point = (level: number, angle: number) => {
      const t = level / steps;
      const span = (1 - t) ** 1.24;
      return new THREE.Vector3(Math.cos(angle) * 2.0 * span + peak.x * t, .61 + (peak.y - .61) * t, Math.sin(angle) * 1.43 * span + peak.z * t);
    };
    for (let level = 0; level <= steps; level++) for (let segment = 0; segment <= sides; segment++) {
      const p = point(level, segment / sides * Math.PI * 2); vertices.push(p.x, p.y, p.z);
    }
    for (let level = 0; level < steps; level++) for (let segment = 0; segment < sides; segment++) {
      const a = level * (sides + 1) + segment, b = a + sides + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const fabric = new THREE.BufferGeometry(); fabric.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); fabric.setIndex(indices); fabric.computeVertexNormals();
    mesh(fabric, "#e7ecd8", 0, 0, 0, .11, .52);
    for (let rib = 0; rib < 20; rib++) {
      const angle = rib / 20 * Math.PI * 2;
      curve(rib % 5 === 0 ? "#a7bbb2" : "#c0cec0", Array.from({ length: steps + 1 }, (_, level) => point(level, angle)), rib % 5 === 0 ? .024 : .014);
    }
    for (const level of [1, 3, 5, 7]) {
      const points = Array.from({ length: 33 }, (_, index) => point(level, index / 32 * Math.PI * 2));
      curve("#c4d0c0", points, .011);
    }
    rod(P.ivory, new THREE.Vector3(-.32, .28, -.2), new THREE.Vector3(.67, 4.21, -.36), .065);
    rod(P.gold, new THREE.Vector3(.61, 3.77, -.35), new THREE.Vector3(.69, 4.48, -.37), .027);
    sphere(P.gold, .68, 4.35, -.37, .075, .3);
    for (let i = 0; i < 14; i++) {
      const angle = i / 14 * Math.PI * 2;
      const x = Math.cos(angle) * 1.92, z = Math.sin(angle) * 1.4;
      cylinder(P.ivory, x, .44, z, .035, .39);
    }
    box(P.ivory, 0, .24, 1.47, 1.7, .12, .38);
    box(P.glass, 0, .47, 1.4, .83, .38, .08);
  }

  if (kind === "palace") {
    plaza();
    // A broad modernist cultural palace: flat roof, deep foyer and tall columns.
    box(P.stone, 0, .22, -.18, 3.96, .18, 2.5);
    box(P.ivory, 0, 1.27, -.52, 3.9, 1.92, 1.7);
    box(P.teal, 0, 1.16, .373, 3.48, 1.32, .09);
    box("#c8d7ce", 0, 2.34, -.46, 4.06, .22, 1.94);
    box(P.ivory, 0, 1.98, .6, 4.1, .21, .75);
    box(P.gold, 0, 2.08, .997, 3.85, .046, .035);
    for (const x of [-1.66, -1.0, -.34, .34, 1.0, 1.66]) {
      box(P.ivory, x, 1.13, .81, .13, 1.57, .18);
      box(P.stone, x, .39, .81, .24, .13, .28);
    }
    for (let i = 0; i < 3; i++) box(i % 2 ? P.stone : P.ivory, 0, .17 + i * .074, 1.41 - i * .23, 3.24 - i * .28, .08, .38);
    for (const x of [-1.55, -.9, -.25, .4, 1.05, 1.7]) box(P.glass, x, 1.35, -1.395, .38, .62, .022);
    // The low administrative wing and roof lanterns preserve the Soviet-modern silhouette.
    box(P.warm, -1.5, .7, -.7, .92, .85, 1.4);
    for (const x of [-1.25, 0, 1.25]) {
      box("#aec8c5", x, 2.52, -.58, .48, .16, .52);
      cylinder(P.silver, x, 2.94, -.58, .022, .8);
      box(P.teal, x + .13, 3.23, -.58, .25, .18, .025);
    }
    for (const x of [-1.82, 1.82]) {
      cylinder("#d9d2af", x, .25, 1.24, .23, .17);
      sphere("#799a70", x, .54, 1.24, .28);
    }
  }

  if (kind === "zheruyik") {
    plaza();
    box("#a3b98c", 0, .16, 0, 4.02, .08, 3.16);
    box("#e5dec0", 0, .214, 0, 1.2, .04, 3.11);
    box("#e5dec0", 0, .216, -.25, 3.82, .04, .44);
    cylinder("#ded6b5", 0, .246, -.25, 1.08, .055);
    // A symbolic park sculpture, not a literal reconstruction of a named monument.
    cylinder("#b9b196", 0, .36, -.71, .43, .22);
    box("#8a937e", -.13, 1.13, -.71, .27, 1.42, .24).rotation.z = -.12;
    box("#b6ac80", .19, 1.29, -.7, .22, 1.76, .23).rotation.z = -.2;
    const crown = mesh(new THREE.OctahedronGeometry(.3, 0), P.gold, .3, 2.19, -.7, .26, .5);
    crown.scale.set(.7, 1.25, .8);
    // Circular fountain, white water jets and ordered planting beds.
    cylinder(P.ivory, 0, .31, .63, .66, .18);
    cylinder("#6cbbc0", 0, .411, .63, .56, .038);
    cylinder(P.stone, 0, .55, .63, .16, .23);
    cylinder("#c1ece5", 0, .82, .63, .035, .43);
    sphere("#e7f4eb", 0, 1.035, .63, .056);
    for (const sign of [-1, 1]) curve("#bde2d9", [
      new THREE.Vector3(sign * .06, .84, .63), new THREE.Vector3(sign * .23, 1.02, .63), new THREE.Vector3(sign * .43, .44, .63),
    ], .018);
    const foliage = new THREE.ConeGeometry(.33, 1.05, 8);
    for (const x of [-1.52, 1.52]) for (const z of [-1.06, -.38, .33, 1.03]) {
      cylinder("#9e8765", x, .49, z, .045, .5);
      mesh(foliage, z < 0 ? "#3f7559" : "#588767", x, .98, z);
      mesh(foliage, "#608c69", x, 1.23, z).scale.set(.75, .75, .75);
    }
    for (const x of [-.91, .91]) for (const z of [-1.11, 1.06]) {
      box("#738e66", x, .3, z, .54, .12, .42);
      for (const offset of [-.16, 0, .16]) sphere(z > 0 ? "#d7ad67" : "#bd836a", x + offset, .405, z, .086);
    }
    // Low entrance colonnades frame the avenue without hiding the sculpture.
    for (const side of [-1, 1]) {
      for (const x of [side * .68, side * 1.27]) box(P.ivory, x, .56, 1.52, .1, .63, .15);
      box(P.ivory, side * .975, .91, 1.52, .88, .14, .24);
      box(P.gold, side * .975, 1.0, 1.52, .73, .025, .18);
    }
  }

  if (kind === "station") {
    plaza();
    box(P.stone, 0, .23, -.14, 3.99, .18, 2.53);
    // A warm railway-station facade, clock pavilion, long wings and platform roof.
    box(P.warm, 0, .99, -.2, 3.82, 1.34, 1.9);
    box(P.red, 0, 1.72, -.2, 4.04, .15, 2.08);
    box(P.ivory, 0, 1.57, .51, 1.1, 2.45, .73);
    box(P.red, 0, 2.9, .51, 1.34, .17, .91);
    const roof = mesh(new THREE.ConeGeometry(.92, .49, 4), P.red, 0, 3.22, .51);
    roof.rotation.y = Math.PI / 4; roof.scale.z = .8;
    cylinder(P.gold, 0, 3.68, .51, .026, .43);
    sphere(P.gold, 0, 3.91, .51, .065, .25);
    for (const x of [-1.54, -.94, .94, 1.54]) {
      box(P.ivory, x, .96, .788, .48, 1.02, .13);
      box(P.glass, x, 1.02, .864, .3, .66, .034);
      box(P.stone, x, .56, .89, .48, .08, .13);
    }
    box(P.deep, 0, .72, .914, .55, .82, .07);
    for (const x of [-.37, .37]) box(P.stone, x, .88, .953, .13, 1.03, .15);
    box(P.stone, 0, 1.42, .963, .84, .14, .18);
    const face = mesh(new THREE.CircleGeometry(.34, 32), "#fff6dc", 0, 2.3, .89);
    face.castShadow = false;
    torus(P.red, 0, 2.3, .913, .365, .035);
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2;
      const tick = box(P.dark, Math.sin(angle) * .276, 2.3 + Math.cos(angle) * .276, .92, .024, .053, .013);
      tick.rotation.z = -angle;
    }
    rod(P.dark, new THREE.Vector3(0, 2.3, .934), new THREE.Vector3(-.12, 2.39, .934), .015);
    rod(P.dark, new THREE.Vector3(0, 2.3, .935), new THREE.Vector3(.16, 2.44, .935), .013);
    sphere(P.gold, 0, 2.3, .953, .031);
    for (const x of [-1.5, 1.5]) {
      box(P.deep, x, .52, -1.29, .79, .41, .24);
      box(P.silver, x, 1.49, -1.24, .88, .07, .57);
      cylinder(P.stone, x + .31, .94, -1.4, .032, 1.05);
    }
    for (let i = 0; i < 3; i++) box(i % 2 ? P.stone : P.ivory, 0, .18 + i * .061, 1.44 - i * .2, 1.87 - i * .17, .068, .32);
    // An exposed platform track and a short teal carriage make the railway identity
    // readable even when the clock face is only a few pixels across.
    for (let i = 0; i < 11; i++) box("#aa9477", -1.9 + i * .38, .185, 1.51, .11, .07, .46);
    for (const z of [1.34, 1.67]) box("#98adaa", 0, .231, z, 4.06, .045, .034);
    box(P.deep, -1.02, .365, 1.51, 1.79, .19, .37);
    box(P.teal, -1.02, .535, 1.51, 1.79, .37, .37);
    box(P.ivory, -1.02, .755, 1.51, 1.82, .08, .39);
    box(P.gold, -1.02, .44, 1.71, 1.72, .055, .015);
    for (const x of [-1.68, -1.28, -.88, -.48]) box("#bfd9d6", x, .6, 1.711, .24, .17, .018);
    for (const x of [-1.62, -.42]) for (const z of [1.31, 1.71]) {
      const wheel = cylinder(P.dark, x, .3, z, .09, .07); wheel.rotation.x = Math.PI / 2;
    }
  }

  return group;
}
