// Saved map hints use only recorded misses and permanent metadata, never a fabricated run.
export function boundedMiss(misses = {}) {
  const clipped = {};
  for (const [key, n] of Object.entries(misses)) if (Number.isFinite(n) && n > 0) {
    const name = key.slice(0, 40);
    clipped[name] = Math.max(clipped[name] || 0, Math.floor(n));
  }
  return Object.fromEntries(Object.entries(clipped).sort((a, b) => b[1] - a[1]).slice(0, 12));
}
export function sectionName(sections, s, entity = {}) {
  // An overlapping sky loop must not relabel main-path objects at the same distance.
  const rows = sections.map((r) => Array.isArray(r) ? { d0: r[0], d1: r[1], name: r[2] } : r);
  const found = rows.filter((r) => s >= r.d0 && s < r.d1 && !!r.detour === !!entity.detour)
    .sort((a, b) => b.d0 - a.d0)[0];
  return found?.name;
}
export function nextGoal(board = {}, stats = {}, ctx = {}, abilities = {}, copy = {}) {
  const packs = stats.breakables == null ? Object.values(stats.sectionMiss || {}).reduce((a, n) => a + n, 0)
    : Math.max(0, stats.breakables - (stats.broken || 0));
  const dogs = stats.dogsTotal == null ? Object.values(stats.missedDogs || {}).reduce((a, n) => a + n, 0)
    : Math.max(0, stats.dogsTotal - (stats.dogs || 0));
  const sections = {};
  for (const source of [stats.sectionMiss, stats.missedDogs]) for (const [key, n] of Object.entries(source || {})) sections[key] = (sections[key] || 0) + n;
  const section = Object.keys(sections).sort((a, b) => sections[b] - sections[a])[0];
  const result = (key, args = []) => ({ key, args, text: typeof copy[key] === 'function' ? copy[key](...args) : copy[key] || '' });
  if (!board.golden && packs + dogs > 0 && packs + dogs < 6) return result('hintGolden', [{ packs, dogs, section }]);
  if (!board.goodBoy && Number.isFinite(stats.deathsAtGate) && stats.deathsAtGate <= 6 && !ctx.god) return result('hintGoodBoy', [stats.deathsAtGate]);
  const ratio = stats.snackPotential > 0 ? stats.snackRaw / stats.snackPotential : null;
  if (!ctx.bonus && (board.snack || 0) < 3 && ratio != null) {
    const target = [0.4, 0.6, 0.8][board.snack || 0];
    if (ratio >= target - 0.1 - 1e-9 && ratio < target) return result('hintSnack', [Math.floor(ratio * 100), Math.round(target * 100)]);
  }
  if (!board.hidden && ctx.hidden) {
    const { move, section: near } = ctx.hidden;
    if (move && !abilities[move] && !ctx.sniffer) return result('hintNewMove');
    if (near) return result('hintHidden', [near]);
  }
  if (!board.golden) return packs > 0 ? result('hintGoldenMany', [packs]) : result('hintGoldenGoal');
  // Completion means all slots; don't advertise a complete board with an unearned slot.
  if (!board.goodBoy) return result(ctx.god ? 'hintGoodBoyGod' : 'hintGoodBoyGoal');
  if (!ctx.bonus && (board.snack || 0) < 3) return result('hintSnackGoal', [[40, 60, 80][board.snack || 0]]);
  return result(ctx.trialAvailable ? 'hintCompleteTrial' : 'hintComplete');
}

export function savedGoalStats(data, id, def) {
  const missedDogs = {};
  for (const [dog, section] of Object.entries(def.dogs || {})) if (!data.dogsFreed?.[`${id}:${dog}`]) missedDogs[section] = (missedDogs[section] || 0) + 1;
  return { sectionMiss: boundedMiss(data.lastMiss?.[id]), missedDogs };
}

export function missesBySection(entities, sections, project, fallback) {
  const misses = {};
  for (const entity of entities) {
    const distance = entity.pos ? project(entity.pos.x, entity.pos.z).s : NaN;
    const name = sectionName(sections, distance, entity) || fallback;
    misses[name] = (misses[name] || 0) + 1;
  }
  return boundedMiss(misses);
}
