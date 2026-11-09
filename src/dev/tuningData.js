// Development telemetry only; callers never import this from the production graph.
export const DEATH_KEY = 'nobu-dev-deaths';
export const SECTION_KEY = 'nobu-dev-sections';
export const RECORD_LIMIT = 2000;

export function readRecords(storage, key) {
  try {
    const rows = JSON.parse(storage?.getItem(key) || '[]');
    return Array.isArray(rows) ? rows.slice(-RECORD_LIMIT) : [];
  } catch { return []; }
}

function writeRecords(storage, key, rows) {
  try { storage?.setItem(key, JSON.stringify(rows)); } catch { /* Private mode / quota. */ }
  return rows;
}

export function isDeath(row) {
  return row && ['string', 'number'].includes(typeof row.level) &&
    Number.isFinite(row.d) && Number.isFinite(row.x) && Number.isFinite(row.t) && typeof row.cause === 'string';
}

export function appendDeath(storage, death) {
  const rows = readRecords(storage, DEATH_KEY).filter(isDeath);
  if (isDeath(death)) rows.push(death);
  rows.sort((a, b) => a.t - b.t);
  return writeRecords(storage, DEATH_KEY, rows.slice(-RECORD_LIMIT));
}

// A detour can occupy the same track distance as the main path. Use its actual
// support/height/lateral context, rather than treating sectionAt(s) as sufficient.
export function sectionFor(stage, player, d = player?.body?.s, context) {
  const track = stage?.track;
  if (!track || !Number.isFinite(d)) return null;
  let onDetour = (stage.detours || []).some((detour) => {
    if (detour.solids?.has(player?.body?.ground)) return true;
    // Height is only a fallback inside this branch's authored section. A high
    // jump much later on the main route must not inherit an earlier sky path.
    const inSection = (track.sections || []).some((section) => section.detour &&
      d >= section.d0 && d < section.d1 &&
      (!Number.isFinite(detour.entryD) ||
        (detour.entryD >= section.d0 && detour.entryD < section.d1)));
    if (!inSection) return false;
    const offset = player?.pos?.y - track.heightAt(d);
    if (detour.y > 0) return offset >= detour.y - 1;
    if (detour.y < 0) return offset <= detour.y + 1;
    return Math.abs(player?.body?.u ?? 0) > 4.3;
  });
  // Keep the branch while airborne: a fatal fall below a sky platform is still
  // a sky-section death. Landing on the main path clears it.
  if (context) {
    if (!player?.body?.grounded && context.detour !== undefined && !onDetour) onDetour = context.detour;
    context.detour = onDetour;
  }
  let found = null;
  for (const section of track.sections || []) {
    if (!!section.detour !== onDetour || d < section.d0 || d >= section.d1) continue;
    if (!found || section.d0 >= found.d0) found = section;
  }
  return found;
}

export function deathCounts(rows, level, sections = []) {
  const counts = Object.create(null);
  for (const row of rows) {
    if (!isDeath(row) || String(row.level) !== String(level)) continue;
    const section = typeof row.section === 'string' ? row.section : sections
      .filter((s) => !s.detour && row.d >= s.d0 && row.d < s.d1)
      .sort((a, b) => b.d0 - a.d0)[0]?.name;
    const name = section || 'Unsectioned';
    counts[name] = (counts[name] || 0) + 1;
  }
  return counts;
}

export function advanceTimer(session, player, dt, times, context) {
  if (!Number.isFinite(dt) || dt <= 0 || session.phase !== 'level' || session.busy || session.over ||
      session.dying || session.bonusRound || player.dead || player.frozen || session.game.ui?.talking) return;
  const name = sectionFor(session.stage, player, player.body.s, context)?.name;
  if (name) times[name] = (times[name] || 0) + dt;
}

export function appendSections(storage, record) {
  return writeRecords(storage, SECTION_KEY, [...readRecords(storage, SECTION_KEY), record].slice(-RECORD_LIMIT));
}
