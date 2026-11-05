// Smog Remix progress is separate from ordinary boards and story progression.
// Pass the actual registry definition so reserved/unshipped ids cannot enter.
export function remixAvailable(data, def) {
  return !!data?.beaten?.[5] && !!def?.shipped && !def.bonus && !def.meta &&
    /^[1-6]$/.test(String(def.id)) && typeof def.build === 'function';
}

export function sessionModes({ trial = false, remix = false, rush = false } = {}) {
  const modes = { trial: !!trial, remix: !!remix, rush: !!rush };
  if (Object.values(modes).filter(Boolean).length > 1) throw new Error('Session modes are mutually exclusive');
  return modes;
}

// Capture before the missed-backpack rain and boss arena replace the field.
// Boss deaths do not change this snapshot. God use is sticky for the whole run.
export function remixGateResult(stats, ctx = {}) {
  const finite = key => Number.isFinite(stats?.[key]) && stats[key] >= 0;
  return Object.freeze({ golden: !!ctx.remix && !ctx.trial && !ctx.rush &&
    !ctx.god && !ctx.godUsed && !stats?.godUsed &&
    finite('breakables') && stats.breakables > 0 && finite('broken') && stats.broken >= stats.breakables &&
    finite('dogsTotal') && finite('dogs') && stats.dogs >= stats.dogsTotal });
}

// Call only after the retained boss is defeated (or the main goal is cleared).
// Return whether this clear earned a new bone; never erase an earlier clear.
export function applyRemixResult(data, id, candidate, ctx = {}) {
  if (!/^[1-6]$/.test(String(id)) || !candidate?.golden || !ctx.remix ||
      ctx.trial || ctx.rush || ctx.god || ctx.godUsed || !ctx.completed) return false;
  if (data.remix?.[id]?.golden) return false;
  data.remix ||= {};
  data.remix[id] = { golden: true };
  return true;
}
