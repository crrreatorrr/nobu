// Stable story order is independent of numeric ids and which chapters ship today.
export const MAIN_STORY_ORDER = Object.freeze([1, 2, 3, 4, 6, 5]);
const shipped = (registry, id) => registry[id]?.shipped && !registry[id]?.bonus && !registry[id]?.meta;
export function nextMainLevel(id, registry) {
  const index = MAIN_STORY_ORDER.indexOf(Number(id));
  const next = index >= 0 ? MAIN_STORY_ORDER[index + 1] : undefined;
  return next !== undefined && shipped(registry, next) ? next : null;
}
export function isFinalStoryLevel(id, registry) {
  const expanded = [4, 6, 5].some(level => shipped(registry, level));
  return Number(id) === (expanded ? 5 : 3);
}
// Reconcile older clears when a new chapter first becomes available. Never close
// an earned node, skip a missing prerequisite, or alter legacy unlocked<=3.
export function unlockFollowingMain(data, registry) {
  const fresh = [];
  data.open ||= { 1: true };
  for (const id of MAIN_STORY_ORDER) {
    if (!data.beaten?.[id]) continue;
    const next = nextMainLevel(id, registry);
    if (next !== null && !data.open[next]) { data.open[next] = true; fresh.push(next); }
  }
  return fresh;
}
