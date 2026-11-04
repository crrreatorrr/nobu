import { savedBoard } from './bones.js';
export const KENNEL_MILESTONES = [
  { at: 8, id: 'jukebox' }, { at: 16, id: 'buddy' }, { at: 24, id: 'fur' },
  { at: 32, id: 'gallery' }, { at: 42, id: 'sniffer' }, { at: 'all', id: 'golden' },
];
const entries = (reg) => Object.values(reg?.LEVELS || reg || {}).filter((e) => e.shipped && !e.gauntlet && (e.bonus || /^[1-6]$/.test(String(e.id))));
const dogKeys = (reg) => entries(reg).flatMap((e) => Object.keys(e.dogs || {}).map((id) => `${e.id}:${id}`));
export const totalDogs = (reg) => dogKeys(reg).length;
export const dogsFreedCount = (save, reg) => reg ? dogKeys(reg).filter((id) => save.dogsFreed?.[id] === true).length : Object.values(save.dogsFreed || {}).filter((v) => v === true).length;
export const availableMilestones = (n) => n > 0 ? KENNEL_MILESTONES.filter((m) => m.at === 'all' || m.at <= n) : [];
export function kennelUnlocks(save, n, freed = dogsFreedCount(save)) {
  return availableMilestones(n).filter((m) => freed >= (m.at === 'all' ? n : m.at)).map((m) => m.id);
}
// Track milestone identities as well as the legacy count: the current-total
// Golden milestone may unlock before later fixed thresholds have shipped.
export function noticeKennelMilestones(data, reg) {
  const kennel = data.kennel ||= { seen: 0 };
  const unlocked = kennelUnlocks(data, totalDogs(reg), dogsFreedCount(data, reg));
  const flags = kennel.seenMilestones ||= Object.fromEntries(unlocked.slice(0, kennel.seen || 0).map((id) => [id, true]));
  const fresh = unlocked.filter((id) => !flags[id]);
  for (const id of unlocked) flags[id] = true;
  kennel.seen = Math.max(kennel.seen || 0, unlocked.length);
  return fresh;
}
const COLORS = { cave: 'red', 2: 'blue', 4: 'green', 6: 'purple', 5: 'yellow' };
const colors = (reg) => [...new Set(entries(reg).map((e) => e.colorBone || COLORS[e.id]).filter(Boolean))];
export function basePointsMax(reg) {
  const levels = entries(reg), n = totalDogs(reg);
  return levels.reduce((sum, e) => sum + (e.bonus ? 3 : 10), 0) + colors(reg).length + Math.floor(n / 3) + availableMilestones(n).length;
}
export function basePoints(save, reg) {
  let points = 0;
  for (const e of entries(reg)) {
    const b = savedBoard(save, e.id);
    points += Number(b.golden) + Number(b.goodBoy) + Number(b.hidden);
    if (!e.bonus) points += Math.min(3, b.snack) + (save.beaten?.[e.id] ? 4 : 0);
  }
  const n = totalDogs(reg), freed = dogsFreedCount(save, reg);
  return points + colors(reg).filter((c) => save.colorBones?.[c]).length + Math.floor(freed / 3) + kennelUnlocks(save, n, freed).length;
}
export function masteryPoints(save, reg) {
  let points = 0;
  const levels = entries(reg).filter((e) => !e.bonus);
  for (const e of levels) {
    const tag = save.trials?.[e.id]?.medal;
    if (e.trial && ['gold', 'platinum'].includes(tag)) points += 2;
    if (e.trial && tag === 'platinum') points += 3;
    if (save.remix?.[e.id]?.golden) points += 3;
    if (save.perfect?.[e.id]) points += 2;
    if (e.bossKey) {
      if (save.bossMedals?.[e.bossKey]?.noHit) points += 3;
      if (save.bossMedals?.[e.bossKey]?.speed) points += 2;
    }
  }
  const all = Object.values(reg?.LEVELS || reg || {});
  if (all.some((e) => e.id === 'rush' && e.shipped)) points += (save.rush?.clear ? 3 : 0) + (save.rush?.noHit ? 3 : 0);
  for (const e of all.filter((e) => e.shipped && /^g[123]$/.test(e.id))) {
    const g = save.gauntlets?.[e.id];
    points += Number(!!g?.clear) + Number(!!g?.allBoxes) + Number(!!(g?.noDeath || g?.flawless));
  }
  return points;
}
export function goodBoyPercent(save, reg) {
  const max = basePointsMax(reg), mastery = masteryPoints(save, reg);
  const base = max ? Math.min(100, Math.floor(basePoints(save, reg) / max * 100)) : 0;
  return { base, mastery, total: base + mastery };
}
export const secretEndingUnlocked = (save, reg) => !!save.beaten?.['5'] && goodBoyPercent(save, reg).total >= 80;
