import {onCatStageDispose} from '../bosses/catResources.js';
// Only the caller's new materials are owned here. Asset maps and Kit caches stay borrowed.
export function ownGauntletMaterials(stage,materials){
 const owned=new Set(materials);let disposed=false;
 const cleanup=()=>{if(disposed)return;disposed=true;for(const material of owned)material.dispose();};
 onCatStageDispose(stage,cleanup);return cleanup;
}
