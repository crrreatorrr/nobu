// A boss stage owns these resources; asset geometry/maps remain borrowed.
// Register on the stage instance so existing Session/Stage disposal reaches the
// cleanup without changing the shared Stage implementation.
export function onCatStageDispose(stage, cleanup) {
  const previous = stage.dispose?.bind(stage);
  stage.dispose = () => { cleanup(); return previous?.(); };
}
export function materialSet(root) {
  const result = new Set();
  root.traverse(o => { for (const material of (Array.isArray(o.material) ? o.material : [o.material])) if (material) result.add(material); });
  return result;
}
export function disposeMaterials(materials) { for (const material of materials) material.dispose(); }
export function disposeProcedural(root) {
  const geometries = new Set(); root.traverse(o => { if (o.geometry) geometries.add(o.geometry); });
  root.parent?.remove(root);
  for (const geometry of geometries) geometry.dispose();
  disposeMaterials(materialSet(root));
}
// AssetStore.model uses SkeletonUtils.clone for rigged assets, so returned model
// skeletons (and their lazily allocated bone textures) belong to that clone.
export function modelSkeletons(root) {
  const skeletons = new Set(); root.traverse(o => { if (o.isSkinnedMesh && o.skeleton) skeletons.add(o.skeleton); });
  return skeletons;
}
