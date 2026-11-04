// Classic geometry remains available explicitly; the owner approved layout 2.
export const L3_MOVES = [[22,0,0],[22,38,0],[24,0,0],[22,-48,0],[22,0,1.2],[24,40,0],[20,0,0],[22,-42,-1.2],[22,0,0],[22,34,1],[22,0,0],[24,-30,0],[24,0,0]];
export const L3_MOVES_V2 = [[22,0,0],[22,38,0],[24,0,0],[22,-48,0],[7.94,0,.433],
  [22,-14,0],[24,22,0],[24,-8,0],[14.06,0,.767],[24,40,0],[55,0,0],
  [20,0,0],[22,-42,-1.2],[22,0,0],[5.82,9,.265],[25,12,0],[25,-12,0],
  [16.18,25,.735],[22,0,0],[24,-30,0],[24,0,0]];
export const L3_SPLICES = [[98,70],[136,55],[206,50]];
export const shiftL3 = (d) => d + L3_SPLICES.reduce((n,[at,add]) => n + (d >= at ? add : 0),0);
// Half-open spans ending at a splice stop before the inserted section.
export const shiftL3End = (d) => d + L3_SPLICES.reduce((n,[at,add]) => n + (d > at ? add : 0),0);
export const L3_LAYOUT2_INFO = Object.freeze({ layout: 2, active: true, path: 419, gate: 418, trigger: 420, end: 427,
  trial: { gold: 77, silver: 100, bronze: 134, platinum: 70, floorMs: 20600 },
  dogs: { 'pug-a':'Crusher Alley', 'dalmatian-a':'Rug Puzzle', 'corgi-a':'Fan Catwalk', 'shiba-a':'Vacuum Hall', 'dalmatian-b':'Final Stretch',
    'shiba-b':'Sorting Belts', 'pug-b':'Packaging Line', 'corgi-b':'Maintenance Ducts', 'dalmatian-c':'Overhead Rails' },
  hidden: { section: 'Maintenance Ducts', move: 'bark' } });

// Main-route half-open ranges; detours overlap only through explicit context.
export const L3_SECTIONS = [[-8,46,'intake'],[46,70,'crushers'],[70,98,'rugs'],[98,168,'sorting'],[168,188,'rugs'],[188,206,'hammers'],[206,261,'packaging'],[261,288,'fan'],[288,313,'vacuum'],[313,331,'vat'],[331,381,'vatOverflow'],[381,428,'final']];
