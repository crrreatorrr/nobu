// NOBU Relic items. Gameplay's equip spec (EQ §1.1) is the source for these numbers.
// Cone's Tip is earned in this game, so it has no NOBU item.
// Neck holds one id. The cycle is None, Golden Collar, then Clown-Nose Collar.
// Head holds one id too: None, Wizard Hat, Wizard Hat II, then Champion's Crown. Only one at a time.
// Wizard Hat II is a second copy of the Wizard Hat for the Breakwater Coin (Sproto Arcade):
// same Spell Bark, same mesh. `cosmetic.mesh` names the model to draw, so both ids show one hat.
// An item has either one `effect` or a list of `effects`; itemEffects() reads both.

export const SLOTS = ['head', 'neck', 'back', 'body'];
export const VISIBLE_SLOTS = ['head', 'neck'];
export const SLOT_LABEL = { head: 'HEAD', neck: 'NECK', back: 'BACK', body: 'BODY' };

// Shared by both Wizard Hats so their Spell Bark cannot drift apart.
const SPELL_BARK = Object.freeze({
  id: 'spell_bark',
  params: Object.freeze({
    range_m: 9,
    cone_dot: 0.4,
    cooldown_s: 0.7,
    y_tol_m: 2.5,
    rings: 4,
    ring_step_m: 2.2,
    color: 0xa66bff,
    skip_bosses: true,
    unlock_mega_bark: true,
  }),
});
const SPELL_BARK_BLURB = 'Spell Bark: longer, wider, faster. Bosses are still skipped.';

export const NOBU_ITEMS = [
  {
    id: 'nobu_wizard_hat',
    game: 'nobu',
    slot: 'head',
    name: 'Wizard Hat',
    relic: 'tinubu_crown',
    blurb: SPELL_BARK_BLURB,
    effect: SPELL_BARK,
    cosmetic: { mesh: 'nobu_wizard_hat', fallback: 'procedural' },
  },
  {
    id: 'nobu_wizard_hat_2',
    game: 'nobu',
    slot: 'head',
    name: 'Wizard Hat II',
    relic: 'breakwater_coin',
    blurb: SPELL_BARK_BLURB,
    effect: SPELL_BARK,
    // No model of its own: draws the Wizard Hat (GLB model_nobu_wizard_hat, else procedural).
    cosmetic: { mesh: 'nobu_wizard_hat', fallback: 'procedural' },
  },
  {
    id: 'nobu_champions_crown',
    game: 'nobu',
    slot: 'head',
    name: "Champion's Crown",
    relic: 'tidebreaker_belt',
    blurb: 'Triple jump, and a wider bite.',
    // Effect ids and values match the hub item matrix (server/modules/src/effects.ts).
    effects: [
      // One more air jump on top of the double jump: ground + 2 in the air.
      // God mode already gives 3 air jumps; the crown does not add to that.
      { id: 'extra_air_jumps', params: { count: 1 } },
      // Scales the bite sphere (TUNING.BITE_RANGE 0.95 m -> 1.33 m), so the front
      // reach goes from 1.70 m to 2.08 m. 1.4 sits with the other items: Spell Bark
      // stretches the bark 9 / 6.5 = 1.38x, and the Clown-Nose dash adds 3 m once per jump.
      // At 1.4 the crown helps with near misses but does not out-reach the bark.
      { id: 'bite_radius_mult', params: 1.4 },
    ],
    // Procedural until the Higgsfield model lands at public/assets/models/nobu_champions_crown.glb
    // (asset id model_nobu_champions_crown in tools/asset_list_extra.json).
    cosmetic: { mesh: 'nobu_champions_crown', fallback: 'procedural' },
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
  {
    id: 'nobu_clown_collar',
    game: 'nobu',
    slot: 'neck',
    name: 'Clown-Nose Collar',
    relic: 'hpos10i_core',
    blurb: 'One horizontal air dash per jump.',
    effect: {
      id: 'air_dash',
      params: { charges_per_jump: 1, distance_m: 3, dash_time_s: 0.18 },
    },
    cosmetic: { mesh: 'nobu_clown_collar', fallback: 'procedural' },
  },
];

export function itemById(id) {
  if (!id) return null;
  return NOBU_ITEMS.find((item) => item.id === id) || null;
}

// The model an item draws. Wizard Hat II reuses the Wizard Hat's, so this is not always the id.
export function itemMesh(id) {
  const def = itemById(id);
  return def ? def.cosmetic?.mesh || def.id : null;
}

// Every { id, params } an item grants while equipped.
export function itemEffects(def) {
  if (!def) return [];
  if (Array.isArray(def.effects)) return def.effects;
  return def.effect ? [def.effect] : [];
}
