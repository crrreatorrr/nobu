// Geometry-only section metadata. Visible labels are supplied from story/script.js.
export const SECTION_RANGES = {
  1: [[-8,26,'start'],[26,65,'highRoad'],[65,92,'clearing'],[92,112,'treatLedge'],[112,128,'lilyPond'],[128,163,'canopy'],[163,186,'boneSwitch'],[186,201,'planks'],[201,240,'belly'],[240,287,'lastGap'],[287,323,'fork']],
  2: [[0,100,'firstGap'],[100,190,'bluePath'],[190,230,'crumble'],[230,258,'planks'],[258,297,'mushroom'],[297,347,'dock']],
  3: [[-8,46,'intake'],[46,70,'crushers'],[70,118,'rugs'],[118,136,'hammers'],[136,163,'fan'],[163,188,'vacuum'],[188,206,'vat'],[206,253,'final']],
  ride: [[-4,94,'living'],[94,201,'hallway'],[201,313,'toys']],
  cave: [[-4,34,'start'],[34,120,'firstPit'],[120,135,'rafts'],[135,182,'redBone'],[182,195,'steps'],[195,254,'exit']],
};
export function levelSections(id, labels) { return (SECTION_RANGES[id] || []).map(([d0,d1,key]) => ({ d0,d1,name: labels[key] })); }
export function installSections(k, id, labels) { for (const { d0,d1,name } of levelSections(id, labels)) k.section(d0,d1,name); }
export const HIDDEN_SECTION = { 1:'treatLedge', 2:'firstGap', 3:'crushers', ride:'hallway', cave:'firstPit' };
