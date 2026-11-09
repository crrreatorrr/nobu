// God mode tally: the hits and deaths God Mode soaked up this level. Shown under the badge only;
// it is never saved, scored or sent to the hub.

// An enemy keeps calling hurt() every frame while Nobu stands in it, so one touch counts once
// per window.
export const GOD_HIT_WINDOW = 1;

export const createGodTally = () => ({ hits: 0, deaths: 0, cool: 0, lethal: false });

export function tickGodTally(t, dt) {
  if (t && t.cool > 0) t.cool = Math.max(0, t.cool - dt);
}

// `lethal`: without God Mode this would have killed Nobu (a pit, a crusher, or a hit with no mask
// or Golden Collar charge left). Returns true if the tally changed.
export function countGodHit(t, { lethal = false } = {}) {
  if (!t) return false;
  if (t.cool > 0) {
    // a pit right after a bump is still a death, but not a second hit
    if (!lethal || t.lethal) return false;
    t.deaths += 1; t.lethal = true;
    return true;
  }
  t.hits += 1;
  if (lethal) t.deaths += 1;
  t.cool = GOD_HIT_WINDOW; t.lethal = lethal;
  return true;
}

export const godTallyText = (t) => `HITS ${t.hits} · DEATHS ${t.deaths}`;
