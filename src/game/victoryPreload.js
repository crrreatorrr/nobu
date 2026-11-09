// Start loading what follows a boss win while its final stage is still being fought: the rescue
// cutscene panels, the results art and, for chapter finales, the ending panels. Each picture is
// fetched and decoded once in the background, so the post-fight screens appear without a blank
// first frame. Cheap: a handful of Image objects, no per-frame work.
import { Assets } from '../art/assets.js';
import { RESCUE, ENDING, QUEEN_ENDING } from '../story/script.js';

export function victoryImages(level) {
  const panels = [...(RESCUE[level] || []), ...(level === 3 ? ENDING : []), ...(level === 5 ? QUEEN_ENDING : [])];
  return [...new Set([...panels.map((p) => p.img), 'nobu_complete', 'level_map'])];
}

export function preloadVictory(level, { url = (id) => Assets.url(id), make = typeof Image === 'undefined' ? null : () => new Image() } = {}) {
  if (!make) return [];
  return victoryImages(level).map((id) => {
    const img = make();
    img.decoding = 'async';
    img.src = url(id);
    img.decode?.().catch(() => {});
    return img;
  });
}
