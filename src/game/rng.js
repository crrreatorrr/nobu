export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash32(...parts) {
  let h = 2166136261;
  for (const p of parts.join('|')) { h ^= p.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const MYSTERY_TABLE = Object.freeze([
  { id: 'tickets', w: 40 }, { id: 'sphere', w: 25 }, { id: 'cat', w: 15 },
  { id: 'tramp', w: 10 }, { id: 'oneUp', w: 10 },
]);
export function rollMystery(runSeed, levelId, slot, table = MYSTERY_TABLE) {
  if (!table.length || table.some((e) => !(e.w > 0))) throw new Error('Invalid Mystery table');
  const r = mulberry32(hash32(runSeed, levelId, slot))();
  const total = table.reduce((sum, e) => sum + e.w, 0);
  let acc = 0;
  for (const e of table) { acc += e.w / total; if (r < acc) return e.id; }
  return table.at(-1).id;
}
