import * as THREE from "three";

/** Collapse static repeated details into GPU instances, retaining district picking. */
export function batchCityScenery(root: THREE.Group, excluded: Set<THREE.Object3D>, pickTargets: THREE.Object3D[]): void {
  const buckets = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material; cast: boolean; districtId?: string; matrices: THREE.Matrix4[] }>();
  const removed = new Set<THREE.Object3D>();
  const local = new THREE.Matrix4();
  root.updateMatrixWorld(true);
  function visit(object: THREE.Object3D, districtId?: string) {
    if (excluded.has(object)) return;
    districtId = object.userData.districtId ?? districtId;
    if (object instanceof THREE.Mesh && !Array.isArray(object.material) && !object.material.transparent) {
      const key = `${object.geometry.uuid}:${object.material.uuid}:${object.castShadow}:${districtId ?? ""}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { geometry: object.geometry, material: object.material, cast: object.castShadow, districtId, matrices: [] };
        buckets.set(key, bucket);
      }
      if (object instanceof THREE.InstancedMesh) {
        for (let index = 0; index < object.count; index++) {
          object.getMatrixAt(index, local);
          bucket.matrices.push(new THREE.Matrix4().multiplyMatrices(object.matrixWorld, local));
        }
        object.dispose();
      } else bucket.matrices.push(object.matrixWorld.clone());
      removed.add(object);
    }
    for (const child of object.children) visit(child, districtId);
  }
  visit(root);
  for (const object of removed) object.removeFromParent();
  for (let index = pickTargets.length - 1; index >= 0; index--) if (removed.has(pickTargets[index])) pickTargets.splice(index, 1);
  for (const bucket of buckets.values()) {
    const instances = new THREE.InstancedMesh(bucket.geometry, bucket.material, bucket.matrices.length);
    instances.name = "city-static-details";
    bucket.matrices.forEach((matrix, index) => instances.setMatrixAt(index, matrix));
    instances.castShadow = bucket.cast;
    instances.receiveShadow = true;
    if (bucket.districtId) {
      instances.userData.districtId = bucket.districtId;
      pickTargets.push(instances);
    }
    instances.computeBoundingSphere();
    root.add(instances);
  }
}
