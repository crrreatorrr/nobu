import { onCatStageDispose } from './catResources.js';

export const queenHazardsPaused = (game) => !!(game.player?.frozen || game.session?.busy);

// Existing Stage disposal reaches per-instance hooks. No borrowed asset maps,
// Enemy caches, Sprite geometry or shared shadow geometry is disposed here.
export function queenCleanup(stage, cleanup) {
  let disposed = false;
  const once = () => {
    if (!disposed) {
      disposed = true;
      cleanup();
    }
  };
  onCatStageDispose(stage, once);
  return once;
}

export function queenProceduralCleanup(stage, roots, textures = []) {
  const geometries = new Set(),
    materials = new Set(),
    skeletons = new Set();
  for (const root of roots)
    root.traverse((obj) => {
      if (obj.isMesh && obj.geometry && !obj.geometry.userData.shared) geometries.add(obj.geometry);
      for (const material of Array.isArray(obj.material) ? obj.material : [obj.material])
        if (material) materials.add(material);
      if (obj.isSkinnedMesh && obj.skeleton) skeletons.add(obj.skeleton);
    });
  return queenCleanup(stage, () => {
    for (const root of roots) root.parent?.remove(root);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const skeleton of skeletons) skeleton.dispose();
    for (const texture of textures) texture.dispose();
  });
}
