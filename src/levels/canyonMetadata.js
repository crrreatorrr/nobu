import { SECTION_RANGES } from './sections.js';
import { extendedD, SB, CF, SF, YA } from './data/l2-extended.js';

// Registry and builder share the final ranges; detours remain distinct from the main route.
export function canyonMainSections(labels) {
  const sections=[];
  for(const [a,b,key] of SECTION_RANGES['2']) {
    const bounds=[a,...[199.5,260,297].filter(d=>d>a&&d<b),b];
    for(let i=1;i<bounds.length;i++) {
      const d0=extendedD(bounds[i-1]-30),d1=extendedD(bounds[i]-30-.000001)+.000001;
      if(d1>d0)sections.push({d0,d1,name:labels[key]});
    }
  }
  for(const [d0,length,key]of[[SB,60,'switchbacks'],[CF,14,'cardboardFort'],[SF,90,'scratchpostForest'],[YA,55,'yarnAvalanche']])sections.push({d0,d1:d0+length,name:labels[key]});
  return sections.sort((a,b)=>a.d0-b.d0);
}
export function canyonSections(labels) {
  return [...canyonMainSections(labels),
    {d0:extendedD(117),d1:extendedD(158)+.001,name:labels.catFlapAlley,detour:true},
    {d0:SF+52,d1:SF+70+.001,name:labels.dryRiverbed,detour:true},
  ].sort((a,b)=>a.d0-b.d0);
}
