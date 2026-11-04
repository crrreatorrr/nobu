// Layout2 presentation uses the same splice data as geometry. Legacy section
// ranges remain unchanged because the candidate builders shift that authoring.
import { SECTION_RANGES } from './sections.js';
import { shiftSpans, RIDE_SPLICES, CAVE_SPLICES } from './data/bonus-layout2.js';
export function bonusSectionsV2(id, labels, text) {
  const splices = id === 'ride' ? RIDE_SPLICES : CAVE_SPLICES;
  const sections = SECTION_RANGES[id].flatMap(([a,b,key]) => shiftSpans(a,b,splices).map(([d0,d1]) => ({d0,d1,name:labels[key]})));
  const extra = id === 'ride' ? [[130,180,'split'],[175,205,'sofa'],[255,295,'ramps'],[379,419,'tile'],[419,447,'door']]
    : [[135,180,'river'],[227,270,'mushrooms'],[267,285,'hollow'],[319,359,'crystals']];
  return sections.concat(extra.map(([d0,d1,key]) => ({d0,d1,name:text[id][key], ...(['sofa','hollow'].includes(key)?{detour:true}:{})}))).sort((a,b)=>a.d0-b.d0);
}
