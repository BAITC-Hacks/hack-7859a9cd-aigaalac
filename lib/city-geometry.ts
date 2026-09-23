import * as THREE from "three";
import type { CityFeature, CityFeatureKind, CityVisualState, DistrictVisualState } from "./city-visuals";
import { DISTRICT_IDENTITIES } from "./district-identities";
import { createDistrictLandmark } from "./city-landmarks";
import { batchCityScenery } from "./city-batching";
import { createDistrictFocus } from "./city-focus";

import { CITY_STREETS, DISTRICT_LAYOUTS, DISTRICT_POSITIONS, createCityParcels } from "./city-layout";
export { DISTRICT_POSITIONS } from "./city-layout";

export interface AnimatedCar {
  object: THREE.Group;
  origin: THREE.Vector3;
  phase: number;
  speed: number;
  direction: 1 | -1;
  axis: "x" | "z";
  distance: number;
}
export interface CityGeometry {
  root: THREE.Group;
  pickTargets: THREE.Object3D[];
  districtTargets: Map<string, THREE.Vector3>;
  districtBounds: Map<string, THREE.Box3>;
  focusRings: Map<string, THREE.Group>;
  cars: AnimatedCar[];
  featureNodes: Map<string, THREE.Group>;
  landmarkNodes: Map<string, THREE.Group>;
}

const C = {
  ground: "#b5bd9a", edge: "#979f89", grass: "#96ad79", dark: "#384644",
  road: "#51595c", asphalt: "#697174", curb: "#d6d4c9", water: "#438b9e",
  tree: "#54876c", treeLight: "#76a37b", trunk: "#927658", teal: "#138b83",
  gold: "#ddb460", white: "#f7f5e8", glass: "#83b4b5", ink: "#294c49",
  blue: "#6d9da7", yellow: "#e5bd69", coral: "#cf8968", pipe: "#4b9fac",
};

const FEATURE_PLOTS = new Set<CityFeatureKind>(["park", "clean-heating", "school", "clinic", "sports"]);
const PLOTS: readonly (readonly [number, number])[] = [[-3.1, -2.7], [3.1, -2.7], [-3.1, 3.05], [3.1, 3.05]];
const PREFERRED_PLOT: Partial<Record<CityFeatureKind, number>> = { park: 0, "clean-heating": 1, school: 0, clinic: 3, sports: 2 };

function hash(text: string): number {
  let value = 2166136261;
  for (const character of text) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return value >>> 0;
}
function random(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dispose shared geometries, materials and generated label textures exactly once. */
export function disposeCityGeometry(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) object.dispose();
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    material.dispose();
  }
  for (const texture of textures) texture.dispose();
  for (const geometry of geometries) geometry.dispose();
  root.clear();
}

export function createCityGeometry(state: CityVisualState): CityGeometry {
  const root = new THREE.Group();
  root.name = "astana-schematic-city";
  const pickTargets: THREE.Object3D[] = [];
  const districtTargets = new Map<string, THREE.Vector3>();
  const districtBounds = new Map<string, THREE.Box3>();
  const focusRings = new Map<string, THREE.Group>();
  const featureNodes = new Map<string, THREE.Group>();
  const landmarkNodes = new Map<string, THREE.Group>();
  const cars: AnimatedCar[] = [];
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
  const leafGeometry = new THREE.IcosahedronGeometry(1, 1);
  const gableGeometry = new THREE.ConeGeometry(1, .5, 4);
  const sphereGeometry = new THREE.SphereGeometry(1, 12, 8);

  function material(color: string, options: { emissive?: boolean; opacity?: number; metalness?: number } = {}) {
    const key = JSON.stringify([color, options]);
    let result = materials.get(key);
    if (!result) {
      result = new THREE.MeshStandardMaterial({
        color, roughness: .72, flatShading: false,
        metalness: options.metalness ?? .02,
        ...(options.opacity === undefined ? {} : { transparent: true, opacity: options.opacity, depthWrite: false }),
        ...(options.emissive ? { emissive: color, emissiveIntensity: .32 } : {}),
      });
      materials.set(key, result);
    }
    return result;
  }
  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, cast = true) {
    const object = new THREE.Mesh(geometry, material(color));
    object.position.set(x, y, z);
    object.castShadow = cast;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent: THREE.Object3D, color: string, x: number, y: number, z: number, w: number, h: number, d: number, cast = true) {
    const object = mesh(parent, unitBox, color, x, y, z, cast);
    object.scale.set(w, h, d);
    return object;
  }
  function cylinder(parent: THREE.Object3D, color: string, x: number, y: number, z: number, radius: number, height: number, cast = true) {
    const object = mesh(parent, unitCylinder, color, x, y, z, cast);
    object.scale.set(radius, height, radius);
    return object;
  }
  function rod(parent: THREE.Object3D, color: string, start: THREE.Vector3, end: THREE.Vector3, radius: number) {
    const delta = end.clone().sub(start);
    const object = cylinder(parent, color, 0, 0, 0, radius, delta.length());
    object.position.copy(start).add(end).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return object;
  }
  function ball(parent: THREE.Object3D, color: string, x: number, y: number, z: number, r: number, lowPoly = false) {
    const object = mesh(parent, lowPoly ? leafGeometry : sphereGeometry, color, x, y, z);
    object.scale.setScalar(r);
    return object;
  }
  function tree(parent: THREE.Object3D, x: number, z: number, scale = 1, light = false) {
    cylinder(parent, C.trunk, x, .46 * scale, z, .08 * scale, .65 * scale);
    const crown = mesh(parent, leafGeometry, light ? C.treeLight : C.tree, x, 1.02 * scale, z);
    crown.scale.set(.5 * scale, .67 * scale, .48 * scale);
    crown.rotation.y = x + z;
  }
  function roof(parent: THREE.Object3D, color: string, x: number, y: number, z: number, w: number, d: number) {
    box(parent, color, x, y, z, w + .12, .15, d + .12);
  }
  function label(parent: THREE.Object3D, text: string, x: number, y: number, z: number, width = 6.2) {
    const canvas = document.createElement("canvas");
    canvas.width = 768; canvas.height = 132;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "rgba(251, 251, 240, 0.96)";
    context.beginPath(); context.roundRect(5, 5, 758, 122, 42); context.fill();
    context.strokeStyle = "rgba(49, 82, 68, .18)"; context.lineWidth = 3; context.stroke();
    context.fillStyle = C.teal; context.beginPath(); context.arc(60, 66, 10, 0, Math.PI * 2); context.fill();
    context.fillStyle = C.ink; context.font = '600 48px system-ui, -apple-system, sans-serif';
    context.textAlign = "center"; context.textBaseline = "middle";
    context.fillText(text.replace(/ ауданы$/, ""), 405, 67, 590);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false }));
    sprite.position.set(x, y, z); sprite.scale.set(width, width * 132 / 768, 1);
    sprite.renderOrder = 12;
    parent.add(sprite);
  }
  function vehicle(parent: THREE.Object3D, color: string, x: number, z: number, bus = false) {
    const group = new THREE.Group(); group.position.set(x, .28, z); parent.add(group);
    const length = bus ? 1.3 : .67;
    box(group, C.dark, 0, .05, 0, length * .86, .14, .33);
    box(group, color, 0, .2, 0, length, .29, .41);
    box(group, bus ? C.ink : C.glass, 0, .38, 0, length * .71, .15, .32);
    if (bus) for (const side of [-1, 1]) box(group, C.white, 0, .27, side * .213, 1.02, .04, .013, false);
    return group;
  }
  function lamp(parent: THREE.Object3D, x: number, z: number, active = false) {
    cylinder(parent, active ? C.dark : "#8e9b8d", x, 1.04, z, .045, 1.68);
    box(parent, active ? C.gold : "#adb39d", x + .16, 1.88, z, .46, .11, .2);
    if (active) {
      const glow = box(parent, C.yellow, x + .16, 1.81, z, .33, .035, .16, false);
      glow.material = material(C.yellow, { emissive: true });
      box(parent, C.ink, x + .11, 1.37, z + .11, .18, .12, .2);
    }
  }
  let buildingCount = 0;
  function building(parent: THREE.Object3D, district: DistrictVisualState, x: number, z: number, index: number, rng: () => number, scale = 1) {
    buildingCount++;
    const modern = district.id === "esil" || district.id === "nura";
    const house = district.id === "saryarka" && index % 3 !== 0;
    const tower = modern && index % 3 === 0;
    const height = (tower ? 4.3 + rng() * 4.2 : house ? .65 + rng() * .7 : 1.7 + rng() * 2.5) * scale;
    const width = (tower ? 1.1 : house ? 1.1 : 1.35) * scale;
    const depth = (house ? 1.2 : 1.35) * scale;
    const identity = DISTRICT_IDENTITIES[district.id];
    const colors = modern ? ["#b2c5cc", "#dddcd3", "#9eafb5", "#d1c4af"] : ["#c5b8a1", "#d5cebc", "#bc947e", "#bfc4bf"];
    const color = colors[index % colors.length];
    box(parent, "#a9aaa0", x, .25, z, width + .16, .16, depth + .16);
    box(parent, color, x, .3 + height / 2, z, width, height, depth);
    roof(parent, house ? "#746257" : "#959c98", x, .34 + height, z, width, depth);
    if (house) {
      const gable = mesh(parent, gableGeometry, identity?.roofColor ?? C.dark, x, .64 + height, z);
      gable.rotation.y = Math.PI / 4;
      gable.scale.set(width * .8, 1, depth * .8);
      cylinder(parent, "#988879", x + .3, .77 + height, z, .07, .55);
    } else {
      box(parent, "#a6aba7", x + width * .18, height + .49, z - depth * .17, width * .35, .25, depth * .38);
      box(parent, "#d8d9cf", x - width * .32, height + .47, z + depth * .26, .16, .2, .27);
    }
    const rows = Math.max(1, Math.floor((height - .25) / .39));
    const windows = new THREE.InstancedMesh(unitBox, material(tower ? "#507788" : "#627879", { metalness: tower ? .35 : .12 }), rows * 8);
    const transform = new THREE.Object3D();
    let count = 0;
    for (let row = 0; row < rows; row++) for (const side of [-1, 1]) for (const column of [-1, 1]) {
      const y = .59 + row * .39;
      transform.position.set(x + column * width * .24, y, z + side * (depth / 2 + .012));
      transform.scale.set(width * (tower ? .39 : .22), .23, .022); transform.updateMatrix(); windows.setMatrixAt(count++, transform.matrix);
      transform.position.set(x + side * (width / 2 + .012), y, z + column * depth * .24);
      transform.scale.set(.022, .23, depth * (tower ? .39 : .22)); transform.updateMatrix(); windows.setMatrixAt(count++, transform.matrix);
      if (!house && !tower && row % 2 === 1 && column === 1) {
        box(parent, "#dddcd2", x + column * width * .24, y - .14, z + side * (depth / 2 + .09), width * .32, .045, .22, false);
        box(parent, "#889b9b", x + column * width * .24, y - .05, z + side * (depth / 2 + .19), width * .32, .15, .025, false);
      }
    }
    windows.castShadow = false; parent.add(windows);
    box(parent, C.ink, x, .51, z + depth / 2 + .026, .22, .43, .035, false);
    box(parent, modern ? "#718b94" : "#a08972", x, .8, z + depth / 2 + .13, .42, .045, .31);
    if (tower) {
      for (const side of [-1, 1]) box(parent, "#d6dce0", x + side * width * .47, height / 2 + .3, z + depth / 2 + .03, .045, height, .06, false);
      box(parent, "#607a85", x, height + .8, z, width * .62, .75, depth * .66);
    }
  }

  // Layered physical model base, river, embankments and three connecting bridges.
  box(root, C.edge, 0, -.51, 0, 82, .5, 64);
  box(root, C.ground, 0, -.19, 0, 82, .16, 64);
  const water = box(root, C.water, 0, -.09, 0, 81.8, .16, 3.8, false);
  water.material = new THREE.MeshStandardMaterial({ color: C.water, roughness: .32, metalness: .16 });
  for (const z of [-2.08, 2.08]) {
    box(root, "#efebd8", 0, .015, z, 81.8, .17, .35, false);
    box(root, "#aebca5", 0, .005, z + Math.sign(z) * .34, 81.8, .14, .28, false);
  }
  for (let index = 0; index < 32; index++) {
    const x = -39 + index * 2.5;
    box(root, "#a7d2ce", x, .008, index % 2 ? .6 : -.72, .6 + index % 3 * .25, .015, .07, false);
  }
  for (const x of [-28, -8, 0, 8, 28]) {
    const narrow = x === 0;
    const w = narrow ? 1.05 : Math.abs(x) === 28 ? 2.5 : 1.9;
    box(root, narrow ? "#d8c8a1" : C.road, x, .3, 0, w, .22, 5.35);
    for (const side of [-1, 1]) {
      rod(root, narrow ? C.gold : "#e9e4cf", new THREE.Vector3(x + side * (w / 2 + .06), .64, -2.7), new THREE.Vector3(x + side * (w / 2 + .06), .64, 2.7), .045);
      for (const z of [-2.4, -.8, .8, 2.4]) cylinder(root, "#b4baa4", x + side * w / 2, .42, z, .045, .5);
    }
    if (!narrow) for (const z of [-1.1, 1.1]) box(root, C.white, x, .422, z, .05, .015, .6, false);
  }
  for (const x of [-19, -17, -4, 4, 17, 19]) for (const z of [-2.7, 2.7]) tree(root, x, z, .65, x > 0);

  // Bәйтерек: gold sphere held in a light lattice, the diorama's central landmark.
  const baiterek = new THREE.Group(); baiterek.name = "baiterek-landmark"; baiterek.position.set(0, .1, 4.3); root.add(baiterek);
  cylinder(baiterek, "#f2ecdc", 0, .04, 0, 1.75, .19);
  cylinder(baiterek, C.gold, 0, .18, 0, 1.24, .1);
  cylinder(baiterek, "#e9e7d9", 0, .49, 0, .62, .65);
  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2;
    rod(baiterek, C.white,
      new THREE.Vector3(Math.cos(angle) * .34, .55, Math.sin(angle) * .34),
      new THREE.Vector3(Math.cos(angle + .3) * .97, 4.58, Math.sin(angle + .3) * .97), .075);
  }
  const ring = mesh(baiterek, new THREE.TorusGeometry(.98, .08, 8, 24), C.gold, 0, 4.58, 0);
  ring.rotation.x = Math.PI / 2;
  const globe = ball(baiterek, C.gold, 0, 5.14, 0, .98);
  globe.material = material(C.gold, { metalness: .45 });
  box(baiterek, "#e8e4cd", 0, .12, 1.8, 2.2, .15, 1.0, false);

  function featureModel(parent: THREE.Group, feature: CityFeature, plot: readonly [number, number] | undefined) {
    const group = new THREE.Group();
    group.name = `feature:${feature.id}`; group.userData = { featureId: feature.id, actionId: feature.actionId, kind: feature.kind, intensity: feature.intensity };
    parent.add(group); featureNodes.set(feature.id, group);
    const [px, pz] = plot ?? [0, 0];
    const intensity = Math.min(1, Math.max(.1, feature.intensity));
    if (plot) {
      group.userData.plot = [...plot];
      for (const side of [-1, 1]) {
        const edgeX = box(group, C.gold, px + side * 2.36, .29, pz, .07, .07, 3.85, false);
        const edgeZ = box(group, C.gold, px, .29, pz + side * 1.92, 4.78, .07, .07, false);
        edgeX.material = edgeZ.material = material(C.gold, { emissive: true });
      }
    }
    switch (feature.kind) {
      case "bus-lane": {
        box(group, "#298f85", 0, .235, .48, 10.9, .028, .45, false);
        for (const x of [-4.2, -2.1, 0, 2.1, 4.2]) box(group, "#d9eed7", x, .253, .28, .72, .018, .04, false);
        vehicle(group, C.yellow, -1.6, .49, true);
        box(group, C.teal, -4.8, .62, 1.25, 1.3, .05, .53);
        for (const x of [-5.25, -4.35]) cylinder(group, C.dark, x, .43, 1.25, .035, .5);
        break;
      }
      case "smart-signals": {
        for (const [x, z] of [[-.83, -.6], [.83, 1.05]]) {
          cylinder(group, C.dark, x, 1.13, z, .055, 1.8);
          box(group, C.dark, x, 1.84, z, .24, .55, .2);
          for (const [index, color] of ["#c98372", "#d4bc74", "#76c4a2"].entries()) {
            const light = ball(group, color, x, 2.01 - index * .16, z + .115, .055);
            light.material = material(color, { emissive: true });
          }
          box(group, "#75a5ad", x + .25, 2.19, z, .55, .06, .37);
        }
        rod(group, C.dark, new THREE.Vector3(-.8, 2.05, -.6), new THREE.Vector3(.5, 2.05, -.6), .035);
        box(group, C.white, .35, 2.04, -.59, .34, .17, .2);
        break;
      }
      case "light-rail": {
        for (const z of [-4, -1.5, 1, 3.5]) box(group, "#adbbb2", 5.03, 1.17, z, .32, 1.95, .45);
        box(group, "#b5c5bd", 5.03, 2.18, -.1, 1.05, .19, 10.4);
        for (const x of [4.77, 5.28]) box(group, "#eff0e1", x, 2.32, -.1, .045, .07, 10.2);
        for (const z of [-2.5, -1.2]) {
          box(group, C.teal, 5.03, 2.64, z, .7, .52, 1.14);
          box(group, "#dbe9dc", 5.03, 2.9, z, .68, .09, 1.1);
          box(group, C.ink, 4.665, 2.7, z, .02, .2, .84, false);
        }
        box(group, "#dccca1", 4.35, 2.32, 2.65, .7, .1, 2.05);
        box(group, C.white, 4.35, 3.19, 2.65, 1.02, .08, 2.4);
        for (const z of [1.8, 3.4]) cylinder(group, C.dark, 4.4, 2.72, z, .04, .8);
        break;
      }
      case "park": {
        box(group, "#a9c899", px, .23, pz, 4.45, .1, 3.75, false);
        box(group, "#e4dabb", px, .297, pz, 3.9, .026, .38, false);
        box(group, "#e4dabb", px, .298, pz, .38, .026, 3.4, false);
        const pond = cylinder(group, C.water, px + .85, .3, pz + .7, .6, .035, false); pond.scale.z *= .7;
        for (const [x, z] of [[-1.45, -1.05], [1.5, -1.1], [-1.45, 1.08], [.8, -1.15]]) tree(group, px + x, pz + z, .85 + intensity * .35, x > 0);
        for (const z of [-.55, .55]) box(group, "#a48958", px - .95, .48, pz + z, .6, .1, .24);
        break;
      }
      case "clean-heating": {
        box(group, "#dce5d2", px, .28, pz, 4.0, .12, 3.35, false);
        box(group, "#efe9d5", px, .91, pz, 2.1, 1.2, 1.7);
        roof(group, C.teal, px, 1.58, pz, 2.1, 1.7);
        cylinder(group, "#d9e5dc", px + 1.0, 1.73, pz - .52, .2, 2.05);
        cylinder(group, C.teal, px + 1.0, 2.74, pz - .52, .23, .14);
        for (const x of [-.9, -.25]) cylinder(group, C.pipe, px + x, .65, pz + 1.12, .24, .65);
        box(group, "#628ea0", px - .2, 1.71, pz, 1.15, .09, 1.25).rotation.x = -.18;
        const mark = mesh(group, new THREE.TorusGeometry(.33, .06, 6, 16), "#7cab77", px, 1.02, pz + .875); mark.rotation.z = -.4;
        break;
      }
      case "green-belt": {
        for (const z of [-4.83, 4.83]) {
          box(group, "#b9cfa7", 0, .2, z, 10.65, .08, .55, false);
          for (let i = 0; i < 7; i++) tree(group, -4.75 + i * 1.58, z, .6 + intensity * .45, i % 2 === 0);
        }
        break;
      }
      case "school": {
        box(group, "#ded8b3", px, .25, pz, 4.5, .12, 3.45, false);
        box(group, "#edc878", px, 1.01, pz - .2, 3.25, 1.45, 1.7);
        roof(group, "#658d80", px, 1.78, pz - .2, 3.25, 1.7);
        box(group, C.white, px, 1.35, pz + .675, .7, .38, .065);
        for (const x of [-1.05, -.52, .52, 1.05]) box(group, C.glass, px + x, 1.13, pz + .677, .27, .4, .04, false);
        box(group, C.teal, px, .63, pz + .7, .43, .68, .09);
        for (const x of [-1.4, 1.4]) {
          cylinder(group, C.coral, px + x, .61, pz + 1.15, .055, .7);
          box(group, C.yellow, px + x, .96, pz + 1.15, .65, .1, .35);
        }
        box(group, C.teal, px - 1.0, .33, pz + 1.15, .45, .12, .5);
        break;
      }
      case "clinic": {
        box(group, "#d7e5da", px, .25, pz, 4.25, .12, 3.25, false);
        box(group, C.white, px, 1.14, pz, 2.6, 1.65, 1.8);
        roof(group, "#8dbbaa", px, 2.0, pz, 2.6, 1.8);
        for (const x of [-.9, -.45, .45, .9]) box(group, C.glass, px + x, 1.12, pz + .921, .29, .64, .025, false);
        box(group, "#bd6e5d", px, 1.62, pz + .952, .15, .56, .06);
        box(group, "#bd6e5d", px, 1.62, pz + .954, .54, .15, .065);
        const ambulance = vehicle(group, C.white, px + .62, pz + 1.25);
        box(ambulance, "#bd6e5d", 0, .24, .22, .35, .08, .02);
        break;
      }
      case "sports": {
        box(group, "#7da9a3", px, .26, pz, 4.2, .11, 3.15, false);
        for (const x of [-1.78, 1.78]) box(group, C.white, px + x, .325, pz, .045, .015, 2.58, false);
        for (const z of [-1.29, 1.29]) box(group, C.white, px, .325, pz + z, 3.59, .015, .045, false);
        box(group, C.white, px, .327, pz, .045, .015, 2.56, false);
        const circle = mesh(group, new THREE.TorusGeometry(.49, .028, 4, 24), C.white, px, .333, pz, false); circle.rotation.x = Math.PI / 2;
        for (const x of [-1.89, 1.89]) {
          cylinder(group, C.dark, px + x, .93, pz, .045, 1.15);
          box(group, C.white, px + x, 1.5, pz, .1, .43, .7);
          const hoop = mesh(group, new THREE.TorusGeometry(.17, .025, 4, 12), C.coral, px + x - Math.sign(x) * .21, 1.36, pz); hoop.rotation.x = Math.PI / 2;
        }
        break;
      }
      case "street-lights": {
        for (const x of [-4.6, -2.2, 2.2, 4.6]) for (const z of [-.63, 1.12]) lamp(group, x, z, true);
        break;
      }
      case "safe-crossing": {
        for (const z of [-1.25, 1.85]) {
          for (let i = 0; i < 6; i++) box(group, C.white, -.51 + i * .205, .255, z, .115, .045, .58, false);
          cylinder(group, C.dark, .9, .93, z, .035, 1.45);
          const sign = box(group, C.yellow, .9, 1.64, z, .38, .38, .065); sign.rotation.z = Math.PI / 4;
          box(group, C.ink, .9, 1.63, z + .045, .065, .21, .02, false);
        }
        for (const x of [-1.5, 1.55]) box(group, C.yellow, x, .275, .22, .2, .09, 1.1, false);
        break;
      }
      case "service-hub": {
        const x = -5.0, z = 3.9;
        cylinder(group, "#c6d9c4", x, .27, z, .66, .14);
        box(group, "#edf0df", x, .94, z, .66, 1.22, .58);
        box(group, C.teal, x, 1.11, z + .312, .5, .74, .035);
        box(group, C.white, x, 1.2, z + .34, .32, .18, .024, false);
        box(group, C.white, x - .09, 1.07, z + .34, .08, .12, .024, false);
        cylinder(group, C.gold, x, 1.67, z, .045, .3);
        ball(group, C.teal, x, 1.86, z, .15);
        for (const r of [.3, .46]) { const ring = mesh(group, new THREE.TorusGeometry(r, .025, 5, 24), "#6dafa3", x, 1.86, z); ring.rotation.y = .4; }
        break;
      }
      case "utility-pipes": {
        box(group, "#b2c6c0", 0, .245, -4.0, 8.8, .12, .87, false);
        for (const [z, color] of [[-4.22, C.pipe], [-3.83, C.coral]] as const) rod(group, color, new THREE.Vector3(-4.25, .38, z), new THREE.Vector3(4.25, .38, z), .105);
        for (const x of [-3.4, -.8, 1.8, 3.5]) {
          rod(group, C.pipe, new THREE.Vector3(x, .4, -4.2), new THREE.Vector3(x, .4, -2.9), .08);
          cylinder(group, C.gold, x, .5, -4.21, .075, .25);
        }
        box(group, C.yellow, -4.7, .67, -3.98, .5, .7, .6);
        break;
      }
      case "emergency-hub": {
        const x = 4.3, z = 4.3;
        box(group, "#eee7d5", x, .81, z, 1.82, 1.05, 1.0);
        roof(group, C.coral, x, 1.39, z, 1.82, 1.0);
        box(group, C.dark, x, .78, z + .526, .81, .69, .026);
        box(group, C.coral, x, 1.2, z + .552, 1.68, .1, .04);
        const truck = vehicle(group, C.yellow, x - 1.01, z + .2);
        box(truck, C.teal, 0, .5, 0, .16, .09, .25);
        cylinder(group, C.dark, x + .55, 1.83, z, .025, .85);
        ball(group, C.coral, x + .55, 2.27, z, .08);
        break;
      }
    }
    return group;
  }

  // Continuous streets and outlying neighbourhoods make the five project areas
  // part of one city. These permanent blocks never occupy a project plot.
  function avenue(x: number, z: number, length: number, vertical = false, width = 2.2) {
    const street = new THREE.Group(); street.position.set(x, 0, z);
    if (vertical) street.rotation.y = Math.PI / 2;
    root.add(street);
    box(street, C.curb, 0, .07, 0, length, .17, width + .75, false);
    box(street, C.road, 0, .17, 0, length, .035, width, false);
    for (let along = -length / 2 + .7; along < length / 2; along += 1.55) {
      box(street, "#d5d1b7", along, .193, 0, .65, .012, .035, false);
    }
    for (const side of [-1, 1]) {
      box(street, "#c7c9bd", 0, .194, side * (width / 2 - .08), length, .01, .035, false);
      for (let along = -length / 2 + 2; along < length / 2; along += 5.5) {
        lamp(street, along, side * (width / 2 + .23));
      }
    }
  }
  for (const street of CITY_STREETS) avenue(street.x, street.z, street.length, street.vertical, street.width);
  const districtById = new Map(state.districts.map((district) => [district.id, district]));
  const parcels = createCityParcels();
  for (const [index, parcel] of parcels.entries()) {
    const district = districtById.get(parcel.districtId);
    if (!district) continue;
    const block = new THREE.Group(); block.name = `neighbourhood:${district.id}:${index}`;
    block.position.set(parcel.x, 0, parcel.z); block.userData.districtId = district.id; root.add(block);
    box(block, parcel.garden ? "#9caf86" : "#c3c6ad", 0, .08, 0, 1.64, .15, 1.64, false);
    box(block, C.curb, 0, .18, .72, 1.64, .04, .2, false);
    if (parcel.garden) {
      box(block, "#dfd3b9", 0, .18, 0, .27, .04, 1.5, false);
      tree(block, -.47, -.35, .65, true); tree(block, .47, .23, .6);
      box(block, "#90765a", -.4, .34, .47, .48, .1, .2);
    } else {
      building(block, district, 0, -.1, index, random(hash(block.name)), .84);
      if (index % 4 === 0) tree(block, -.6, .58, .34, true);
    }
  }

  // Walkable embankments, railings, trees, benches and human-scale figures.
  for (const side of [-1, 1]) {
    for (let x = -38; x <= 38; x += 2.4) {
      if ([-28, -8, 0, 8, 28].some((bridge) => Math.abs(x - bridge) < 1.65)) continue;
      tree(root, x, side * 4.5, .68, x > 0);
      cylinder(root, "#7f918c", x, .35, side * 1.97, .025, .55, false);
      box(root, "#b9c2ba", x, .6, side * 1.97, 2.2, .035, .035, false);
      box(root, "#967e64", x, .34, side * 2.35, .6, .1, .21);
      const pedestrianX = x + .8;
      cylinder(root, x % 3 > 1 ? "#a47155" : "#526c83", pedestrianX, .4, side * 2.35, .065, .27, false);
      ball(root, "#c9ab8a", pedestrianX, .6, side * 2.35, .075);
    }
  }
  // Tall cable stays give the outer river crossings a recognisable silhouette.
  for (const x of [-28, 28]) for (const side of [-1, 1]) {
    const edge = x + side * 1.34;
    cylinder(root, "#dadbd2", edge, 2.1, 0, .09, 4.0);
    for (const z of [-2.5, -1.6, -.8, .8, 1.6, 2.5]) rod(root, "#bdc7c3", new THREE.Vector3(edge, 4.1, 0), new THREE.Vector3(edge, .48, z), .018);
  }
  // Two-way traffic on the expanded network; each route has its own origin.
  for (let route = 0; route < 6; route++) {
    const road = [-29.5, -13.77, -7.5, 7.5, 14.23, 29.5][route];
    for (let index = 0; index < 9; index++) {
      const direction: 1 | -1 = index % 2 ? -1 : 1;
      const lane = direction * .52;
      const car = vehicle(root, ["#edece4", "#63727d", "#b2745c", "#a3a6a0", "#40545d"][index % 5], 0, road + lane, index === 0);
      car.rotation.y = direction < 0 ? Math.PI : 0;
      const phase = (index / 9 + route * .17) % 1;
      const origin = car.position.clone();
      const distance = 77;
      const axis = "x";
      car.position[axis] = origin[axis] + (phase - .5) * distance * direction;
      cars.push({ object: car, origin, phase, direction, axis, distance, speed: .009 + index % 3 * .002 });
    }
  }

  state.districts.forEach((district, districtIndex) => {
    const [dx, dz] = DISTRICT_POSITIONS[district.id] ?? [(districtIndex - 2) * 13, 9];
    const identity = DISTRICT_IDENTITIES[district.id];
    const outward = dz < 0 ? -1 : 1;
    const group = new THREE.Group(); group.position.set(dx, 0, dz); group.name = `district:${district.id}`; group.userData.districtId = district.id;
    root.add(group);
    const layout = DISTRICT_LAYOUTS.find(item => item.id === district.id)!;
    const bounds = layout.bounds;
    const centerX = (bounds.minX + bounds.maxX) / 2, centerZ = (bounds.minZ + bounds.maxZ) / 2;
    districtTargets.set(district.id, new THREE.Vector3(centerX, 1.2, centerZ));
    districtBounds.set(district.id, new THREE.Box3(new THREE.Vector3(bounds.minX, 0, bounds.minZ), new THREE.Vector3(bounds.maxX, 9, bounds.maxZ)));
    const territory = box(group, layout.ground, centerX - dx, -.045, centerZ - dz, bounds.maxX - bounds.minX, .11, bounds.maxZ - bounds.minZ, false);
    territory.userData.districtId = district.id; pickTargets.push(territory);
    const tile = box(group, ["#dbe1c8", "#e3dfc6", "#d6dfc7", "#dce4d0", "#e4e4cb"][districtIndex % 5], 0, .02, 0, 12.3, .28, 11.2, false);
    tile.userData.districtId = district.id; pickTargets.push(tile);
    const ring = createDistrictFocus([
      [bounds.minX - dx, bounds.minZ - dz], [bounds.maxX - dx, bounds.minZ - dz],
      [bounds.maxX - dx, bounds.maxZ - dz], [bounds.minX - dx, bounds.maxZ - dz],
    ]); ring.name = `focus:${district.id}`;
    ring.visible = false; group.add(ring); focusRings.set(district.id, ring);
    if (identity) {
      // A permanent forecourt is separate from all four project plots. A new
      // school, park or clinic can never replace a district's existing landmark.
      const plazaZ = outward * 7.7;
      const forecourt = box(group, identity.plazaColor, 0, .02, plazaZ, 8.1, .28, 4.7, false);
      forecourt.name = `landmark-plaza:${district.id}`;
      forecourt.userData.districtId = district.id; pickTargets.push(forecourt);
      box(group, C.curb, 0, .2, outward * 5.65, 1.6, .08, 1.3, false);
      const landmark = createDistrictLandmark(identity.landmark);
      landmark.name = `landmark:${district.id}:${identity.landmark}`;
      landmark.position.set(0, .18, plazaZ);
      landmark.userData = { ...landmark.userData, districtId: district.id, landmarkName: identity.landmarkName };
      landmark.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.userData.districtId = district.id;
          pickTargets.push(object);
        }
      });
      group.add(landmark); landmarkNodes.set(district.id, landmark);
      for (const side of [-1, 1]) {
        for (const z of [-1.25, 1.25]) tree(group, side * 3.1, plazaZ + z, .72, district.id === "almaty");
        box(group, identity.accent, side * 2.9, .38, plazaZ, .85, .12, .3, false);
      }
    }
    box(group, C.curb, 0, .185, .23, 12.1, .045, 1.58, false);
    box(group, C.curb, 0, .185, 0, 1.53, .045, 10.95, false);
    box(group, C.road, 0, .22, .23, 12.1, .035, 1.16, false);
    box(group, C.road, 0, .221, 0, 1.12, .037, 10.95, false);
    for (const x of [-5, -3.5, -2, 2, 3.5, 5]) box(group, "#d9d8b9", x, .245, .23, .55, .01, .045, false);
    for (const z of [-4.5, -3, -1.5, 2, 3.5, 5]) box(group, "#d9d8b9", 0, .246, z, .045, .01, .55, false);
    const assigned = new Map<string, number>();
    const occupied = new Set<number>();
    for (const feature of district.features.filter((item) => FEATURE_PLOTS.has(item.kind))) {
      const preferred = PREFERRED_PLOT[feature.kind] ?? 0;
      const slot = !occupied.has(preferred) ? preferred : PLOTS.findIndex((_, index) => !occupied.has(index));
      if (slot >= 0) { occupied.add(slot); assigned.set(feature.id, slot); }
    }
    PLOTS.forEach(([x, z], plotIndex) => {
      if (occupied.has(plotIndex)) return;
      const lot = new THREE.Group(); lot.name = `project-plot:${district.id}:${plotIndex}`;
      lot.position.set(x, 0, z); group.add(lot);
      // Usable interim space, never housing that vanishes when a project is chosen.
      box(lot, plotIndex % 2 ? "#c8c3ac" : "#a6b98c", 0, .2, 0, 4.65, .075, 3.65, false);
      box(lot, "#dfd8c3", 0, .25, 0, .55, .025, 3.4, false);
      for (const side of [-1, 1]) {
        tree(lot, side * 1.85, -1.2, .6, true);
        box(lot, "#927953", side * 1.35, .42, -1.15, .7, .12, .22);
        for (const end of [-1, 1]) {
          box(lot, "#eee4bb", side * 2.2, .27, end * 1.6, .07, .035, .42, false);
          box(lot, "#eee4bb", side * 2.02, .27, end * 1.77, .42, .035, .07, false);
        }
      }
      if (plotIndex % 2) {
        box(lot, "#858c82", .9, .26, .3, 1.35, .025, 1.8, false);
        for (const pz of [-.15, .5, 1.15]) box(lot, C.white, .9, .28, pz, 1.2, .015, .035, false);
        vehicle(lot, "#e0ded1", .9, .18);
      } else {
        for (const side of [-1, 1]) {
          box(lot, "#7e9b6b", side * 1.2, .3, .55, 1.3, .13, 1.05, false);
          for (const offset of [-.3, .3]) ball(lot, "#ceae6d", side * 1.2 + offset, .42, .55, .1);
        }
      }
      // These labels only appear while this district is selected.
      label(ring, "Жоба орны", x, .48, z + .8, 2.2);
    });
    const count = Math.max(0, Math.min(24, district.treeCount));
    for (let i = 0; i < count; i++) {
      const side = i % 4;
      const n = Math.floor(i / 4);
      const along = -4.7 + n * 1.95;
      const x = side < 2 ? (side ? 5.58 : -5.58) : along;
      const z = side >= 2 ? (side === 2 ? -5.0 : 5.0) : along;
      if (Math.abs(x) < .8 || Math.abs(z - .2) < .8) continue;
      tree(group, x, z, .63 + (i % 3) * .1, i % 2 === 0);
    }
    if (!district.features.some((feature) => feature.kind === "street-lights")) {
      lamp(group, -4.5, -.62); lamp(group, 4.5, 1.08);
    }
    // Air quality changes the visible haze over each district, not just a label.
    const haze = Math.max(0, 1 - district.airQuality);
    if (haze > .15) {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6), material("#b8b9a6", { opacity: haze * .09 }));
      cloud.position.set(0, 2.95, -1.35); cloud.scale.set(5.1, 1.65, 3.6); cloud.renderOrder = 4; group.add(cloud);
    }
    const carCount = 2 + Math.round(Math.max(0, Math.min(1, district.trafficLevel)) * 6);
    for (let i = 0; i < carCount; i++) {
      const direction = i % 2 ? -1 : 1;
      const car = vehicle(group, [C.white, C.coral, C.blue, C.yellow][i % 4], 0, direction > 0 ? .01 : .55);
      if (direction < 0) car.rotation.y = Math.PI;
      const phase = (i / carCount + (districtIndex * .13)) % 1;
      car.position.x = (phase * 11.5 - 5.75) * direction;
      cars.push({ object: car, origin: new THREE.Vector3(0, car.position.y, car.position.z), axis: "x", distance: 11.5, phase, direction, speed: .024 + (1 - district.trafficLevel) * .053 });
    }
    for (const feature of district.features) featureModel(group, feature, assigned.has(feature.id) ? PLOTS[assigned.get(feature.id)!] : undefined);
    label(group, district.name, centerX - dx, 1.1, centerZ - dz + (outward > 0 ? 10 : -10), 8.5);
  });

  root.userData.buildingCount = buildingCount;
  root.userData.infillCount = parcels.length;
  root.userData.projectPlots = state.districts.length * PLOTS.length;
  const excluded = new Set<THREE.Object3D>([...focusRings.values(), ...featureNodes.values(), ...landmarkNodes.values(), ...cars.map((car) => car.object)]);
  batchCityScenery(root, excluded, pickTargets);
  return { root, pickTargets, districtTargets, districtBounds, focusRings, cars, featureNodes, landmarkNodes };
}
