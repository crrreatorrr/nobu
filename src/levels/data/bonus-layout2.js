// H33 candidates; registry activation is deliberately a separate integration step.
export const RIDE_SPLICES = Object.freeze([[130, 50], [205, 40], [289, 68]]);
export const CAVE_SPLICES = Object.freeze([[135, 45], [182, 43], [231, 40]]);
export const RIDE_MOVES_V2 = [
  [40,0,0],[30,14,0],[30,-20,0],[30,12,0],[25,0,0],[25,0,0],
  [30,-14,0],[30,18,0],[15,-5,0],[20,12,0],[20,-12,0],
  [15,-5,0],[30,0,0],[30,6,0],[9,0,0],[20,-14,0],[20,14,0],
  [28,0,0],[21,0,0],[30,0,0],
];
export const CAVE_MOVES_V2 = [
  [36,0,0],[30,-16,-1],[30,20,.6],[30,-12,-.8],[8.95,4.77,0],
  [22.5,-10,-.8],[22.5,10,-.6],[21.05,11.23,0],[25.95,-17.3,.865],
  [21.5,14,1],[21.5,-14,-1],[4.05,-2.7,.135],[30,12,0],[14.93,0,-.3],
  [20,0,0],[20,0,0],[15.07,0,-.3],[24,0,0],
];
export const CAVE_NESTS_V2 = Object.freeze([2,60,118,158,221,248,271,314,338]);
export const shiftDistance = (d, splices) => d + splices.reduce((n,[at,len]) => n + (d >= at ? len : 0), 0);
// Split old ground at EVERY insertion. A span ending at a splice excludes the inserted ground.
export function shiftSpans(a, b, splices) {
  const cuts = [a, ...splices.filter(([d]) => d > a && d < b).map(([d]) => d), b];
  return cuts.slice(0,-1).map((lo,i) => {
    const hi = cuts[i+1];
    return [shiftDistance(lo,splices), hi + splices.reduce((n,[at,len]) => n + (at < hi ? len : 0), 0)];
  });
}
// Existing authoring remains in its original distance domain. Extension calls use the raw kit.
export function shiftedBonusKit(raw, splices) {
  const S = d => shiftDistance(d,splices), k = { ...raw };
  const at2 = ['W','platform','pack','sphere','oneUp','tramp','snacks','cat','rug','lint','zipped','vacSwitch','lunch','arrowBox','broc','spiky','trooper','squirrel','drone','vacuum','mouse','yarn','pill','knight','shellback','toys','leg','dog','mover','crumble','lily','flip','cracked','mushroom','barkRock','colorBone'];
  for (const name of at2) if (raw[name]) k[name] = (...args) => { args[2] = S(args[2]); return raw[name](...args); };
  k.packs = (list,y=0) => raw.packs(list.map(([x,d]) => [x,S(d)]),y);
  k.stack = (x,y,d,h) => raw.stack(x,y,S(d),h);
  for (const name of ['backstop','tut','cable','gate','trigger','yawAt']) k[name] = (d,...args) => raw[name](S(d),...args);
  k.walls = keys => raw.walls(keys.map(([d,...v]) => [S(d),...v]));
  k.floor = (a,b,o) => shiftSpans(a,b,splices).map(([lo,hi]) => raw.floor(lo,hi,o));
  k.section = (a,b,label,o) => shiftSpans(a,b,splices).map(([lo,hi]) => raw.section(lo,hi,label,o));
  k.tix = (x,y,a,xx,yy,b,n) => raw.tix(x,y,S(a),xx,yy,S(b),n);
  k.tixArc = (x,y,a,xx,b,h,n) => raw.tixArc(x,y,S(a),xx,S(b),h,n);
  k.tixRing = (x,y,d,...args) => raw.tixRing(x,y,S(d),...args);
  return k;
}
// Reviewed against actual candidate builders, including all noncountable payers.
export const BONUS_BUDGETS_V2 = Object.freeze({
  ride: Object.freeze({field:92,packs:80,zipped:16,jackpots:0,bark:0,trampoline:0,mystery:0,arena:0,coconut:false}),
  cave: Object.freeze({field:64,packs:70,zipped:16,jackpots:0,bark:15,trampoline:0,mystery:1,arena:0,coconut:false}),
});
