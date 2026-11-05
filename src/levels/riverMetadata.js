// Stable census and section labels, without importing the river builder.
export const RIVER_DOG_SECTIONS = {
  'shiba-a': 'drain', 'pug-a': 'gutter', 'dalmatian-a': 'lock',
  'corgi-a': 'bend', 'shiba-b': 'barge', 'pug-b': 'rainGutter',
  'dalmatian-b': 'pumpHouse',
};
export function riverSections(text) {
  return [
    [-8,26,'drain'],[26,108,'gutter'],[108,160,'lock'],[160,246,'bend'],
    [246,258,'barge'],[258,271.4,'crateDrift'],[271.4,304,'barge'],
    [304,384,'rapids'],[384,426,'floodgate'],[426,455.01,'intake'],
  ].map(([d0,d1,key])=>({d0,d1,name:text[key]})).concat([
    {d0:249,d1:289.01,name:text.rainGutter,detour:true},
    {d0:388,d1:420.01,name:text.pumpHouse,detour:true},
  ]).sort((a,b)=>a.d0-b.d0);
}
