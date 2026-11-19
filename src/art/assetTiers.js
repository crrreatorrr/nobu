// Which manifest assets load when (src/art/assets.js). Ids, not files, so a regenerated
// public/assets/manifest.json (tools/build_asset_list.py) keeps these tiers.
//
// boot  : what the title screen draws. Game.boot waits only for these.
// rest  : everything else a level, boss, Kennel or wardrobe builds with. Loads in the background
//         right after boot; Session.startLevel (and the Kennel / wardrobe) wait for it.
// lazy  : pictures shown only as DOM <img> / CSS (story panels, results and death cards, the map,
//         the gallery) or only as the sprite fallback for a model that failed to load. They are
//         never decoded into a THREE texture up front; Assets.url() gives their file and
//         Assets.tex() loads one on first use.
// unused: authoring references and sources kept in the repo but not used at runtime (not loaded, not shipped
//         in dist/, see vite.config.js).

export const BOOT_TEXTURES = ['bg_title', 'logo', 'textbox', 'sproto_mask', 'tex_l1_ground'];
export const BOOT_MODELS = ['model_sproto_mask'];

export const LAZY = new Set([
  // story panels and gallery art (DOM); story_ending is also the credits sky, loaded on demand
  'story_intro_1', 'story_intro_2', 'story_intro_3', 'story_intro_4',
  'story_rescue_1', 'story_rescue_2', 'story_rescue_3', 'story_ending',
  'concept_keyart', 'concept_environments',
  // map, results and death cards (DOM)
  'level_map', 'nobu_title', 'nobu_complete', 'death_flat', 'death_angel', 'death_cone', 'death_rug',
  // dialogue portraits of characters that have a model (the picture is only a sprite fallback)
  'broccoli', 'broccoli_spiky', 'broccoli_cone', 'mecha_bird', 'big_cat', 'evil_cone',
  'squirrel', 'cone_drone', 'mouse',
  'dog_shiba_coned', 'dog_corgi_coned', 'dog_pug_coned', 'dog_dalmatian_coned',
]);

// nobu_tex_fixed is baked into nobu.glb (tools/optimize_glbs.mjs) and kept as its source.
export const UNUSED = new Set(['nobu_master', 'nobu_sheet', 'nobu_tex_fixed']);
