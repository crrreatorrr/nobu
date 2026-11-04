import * as THREE from 'three';

// Body materials only: accessories are intentionally outside model.model/allMeshes.
// Restore the original color before multiplying, so switching tint never compounds.
const states = new WeakMap();
export function applyFurTint(model, tint) {
  if (!model) return;
  let materials = states.get(model);
  if (!materials) {
    if (model.mats?.fur) materials = [{ material: model.mats.fur, original: model.mats.fur.color.clone() }];
    else {
      const unique = new Set();
      model.model?.traverse((obj) => { if (obj.isMesh) for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) if (mat?.color) unique.add(mat); });
      materials = [...unique].map((material) => ({ material, original: material.color.clone() }));
    }
    states.set(model, materials);
  }
  const color = tint == null ? null : new THREE.Color(tint);
  for (const { material, original } of materials) {
    material.color.copy(original);
    if (color) material.color.multiply(color);
  }
}
