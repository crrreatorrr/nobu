import { onCatStageDispose } from '../bosses/catResources.js';
// Register only procedural resources created by this caller. Borrowed asset maps
// and shared kit textures are deliberately absent from this ownership list.
export function ownRiverRoot(stage,root,textures=[]) {
 const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry){geometries.add(o.geometry);o.geometry.userData.shared=true;}for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});
 let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;root.parent?.remove(root);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of new Set(textures))t.dispose();};
 onCatStageDispose(stage,dispose);return dispose;
}
