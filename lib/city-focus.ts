import * as THREE from "three";

/** A daylight-visible neon outline around the entire district territory. */
export function createDistrictFocus(outline: readonly (readonly [number, number])[]): THREE.Group {
  const group = new THREE.Group();
  const points = outline.map(([x, z]) => new THREE.Vector2(x, z));
  const shape = new THREE.Shape(points);
  const wash = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: "#00e9c0", transparent: true, opacity: .085, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  // Shape coordinates are local X/Z; rotating maps its Y coordinate onto Z.
  wash.rotation.x = Math.PI / 2;
  wash.position.y = .025;
  group.add(wash);

  // A soft alpha falloff gives a glow without a full-screen bloom render pass.
  const pixels = new Uint8Array(64 * 4);
  for (let index = 0; index < 64; index++) {
    const distance = Math.abs(index / 63 * 2 - 1);
    pixels.set([255, 255, 255, Math.round(255 * Math.exp(-distance * distance * 9) * (1 - distance))], index * 4);
  }
  const texture = new THREE.DataTexture(pixels, 1, 64, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const halo = new THREE.MeshBasicMaterial({ color: "#00f5d4", map: texture, transparent: true, opacity: .8, depthWrite: false, toneMapped: false });
  halo.name = "district-neon-halo";
  const rim = new THREE.MeshBasicMaterial({ color: "#00cdb7", toneMapped: false });
  const core = new THREE.MeshBasicMaterial({ color: "#b5fff0", toneMapped: false });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const plane = new THREE.PlaneGeometry(1, 1);

  for (let index = 0; index < points.length; index++) {
    const start = points[index], end = points[(index + 1) % points.length];
    const length = start.distanceTo(end);
    const segment = new THREE.Group();
    segment.position.set((start.x + end.x) / 2, .32, (start.y + end.y) / 2);
    segment.rotation.y = -Math.atan2(end.y - start.y, end.x - start.x);
    group.add(segment);
    const glow = new THREE.Mesh(plane, halo);
    glow.rotation.x = -Math.PI / 2;
    glow.scale.set(length + .2, 1.8, 1);
    glow.renderOrder = 5;
    segment.add(glow);
    const edge = new THREE.Mesh(box, rim);
    edge.scale.set(length + .08, .095, .26);
    segment.add(edge);
    const light = new THREE.Mesh(box, core);
    light.position.y = .055;
    light.scale.set(length + .06, .045, .085);
    segment.add(light);
  }

  // Small illuminated corner posts make the boundary readable when zoomed out.
  const postGeometry = new THREE.CylinderGeometry(.055, .055, .55, 8);
  for (const point of points) {
    const post = new THREE.Mesh(postGeometry, core);
    post.position.set(point.x, .59, point.y);
    group.add(post);
  }
  group.visible = false;
  return group;
}

export function updateDistrictFocus(group: THREE.Group, elapsed: number, reducedMotion: boolean): void {
  // Only the halo breathes; the crisp boundary is always fully visible.
  const opacity = reducedMotion ? .8 : .7 + Math.sin(elapsed * 2.2) * .16;
  group.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial && object.material.name === "district-neon-halo") {
      object.material.opacity = opacity;
    }
  });
}
