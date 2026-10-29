// NOBU Relic items. Gameplay's equip spec (EQ §1.1) is the source for these numbers.
// Cone's Tip is earned in this game, so it has no NOBU item.
// Neck holds one id: the Golden Collar and the Clown-Nose Collar cannot both be worn.

export const SLOTS = ['head', 'neck', 'back', 'body'];
export const VISIBLE_SLOTS = ['head', 'neck'];
export const SLOT_LABEL = { head: 'HEAD', neck: 'NECK', back: 'BACK', body: 'BODY' };

export const NOBU_ITEMS = [
  {
    id: 'nobu_wizard_hat',
    game: 'nobu',
    slot: 'head',
    name: 'Wizard Hat',
    relic: 'tinubu_crown',
    blurb: 'Spell Bark: longer, wider, faster. Bosses are still skipped.',
    effect: {
      id: 'spell_bark',
      params: {
        range_m: 9,
        cone_dot: 0.4,
        cooldown_s: 0.7,
        y_tol_m: 2.5,
        rings: 4,
        ring_step_m: 2.2,
        color: 0xa66bff,
        skip_bosses: true,
        unlock_mega_bark: true,
      },
    },
    cosmetic: { mesh: 'nobu_wizard_hat', fallback: 'procedural' },
  },
  {
    id: 'nobu_golden_collar',
    game: 'nobu',
    slot: 'neck',
    name: 'Golden Collar',
    relic: 'genesis_shard',
    blurb: 'Absorbs one hit. The next hit costs a life. Pits still kill.',
    effect: {
      id: 'damage_guard',
      params: { guard_charges: 1, invuln_s: 1.7, knockback: 6 },
    },
    cosmetic: { mesh: 'nobu_golden_collar', fallback: 'procedural' },
  },
];

export function itemById(id) {
  if (!id) return null;
  return NOBU_ITEMS.find((item) => item.id === id) || null;
}
