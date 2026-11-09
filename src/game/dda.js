// Checkpoint assistance is separate from the existing boss-stage DDA contract.
export const DDA = Object.freeze({ mask1: 3, slow: 5, pityCp: 7, mask2: 9, hazardMul: .92 });

export function checkpointHelpAllowed(ctx = {}) {
  const excluded = ctx.trial || ctx.remix || ctx.rush || ctx.bossRush ||
    ctx.medal || ctx.medalMode || ctx.medalRun || ctx.bossMedal || ctx.bossMedalRun ||
    ctx.ranked || ctx.board || ctx.boardRun || ctx.competitive || ctx.postsToBoard ||
    ctx.phase === 'boss';
  return !excluded;
}

export function ddaFor(deathsAtCp, ctx = {}) {
  if (!checkpointHelpAllowed(ctx)) return { masks: 0, hazardMul: 1, pityCp: false };
  return {
    masks: deathsAtCp >= DDA.mask2 ? 2 : deathsAtCp >= DDA.mask1 ? 1 : 0,
    hazardMul: deathsAtCp >= DDA.slow ? DDA.hazardMul : 1,
    pityCp: deathsAtCp >= DDA.pityCp,
  };
}

// Called after ALL checkpoint entities have restored; armed spots never reset.
export function armCheckpointPity(session) {
  const stage = session.stage, track = stage?.track;
  if (session.phase !== 'level' || !track || !session.cp?.pos || !ddaFor(session.deathsAtCp, session).pityCp) return false;
  const distance = pos => track.project(pos.x, pos.z).s;
  const cp = distance(session.cp.pos);
  const ordinary = stage.entities.filter(e => e.kind === 'snacks' && !e.detour)
    .map(e => distance(e.pos)).filter(d => d > cp + .01);
  const next = ordinary.length ? Math.min(...ordinary) : Infinity;
  // An already-armed, unbroken spot remains the nearest help, preventing a cascade.
  const nearest = stage.entities.filter(e => e.kind === 'pitysnacks' && !e.detour && !e.broken)
    .map(e => ({ e, d: distance(e.pos) })).filter(({ d }) => d > cp + .01 && d < next - .01)
    .sort((a, b) => a.d - b.d)[0]?.e;
  return nearest?.arm() ?? false;
}
