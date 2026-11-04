// New ids keep working until their own art is added to the manifest. Model scale
// multiplies the caller's requested height; transforms apply only to fallbacks.
// House art is deliberately procedural (art/procedural.js), not a manifest file.
export const PLACEHOLDERS = {
  model_roomba_titan: { from: 'model_vacuum', scale: 4.5, tint: 0x3a3d44 },
  model_mini_roomba: { from: 'model_vacuum', scale: 1.4 },
  model_pump_queen: { from: 'model_pill_bot', scale: 5, tint: 0xd23cff },
  model_candle_bot: { from: 'model_pill_bot', tint: 0x4aff8a },
  model_ghost_cat: { from: 'model_small_cat', scale: 1.6, tint: 0x80ffff, opacity: 0.45 },
  model_dust_bunny: { from: 'model_mouse', scale: 1.3, tint: 0x999999 },
  portrait_titan: { from: 'vacuum', tint: 0x3a3d44 },
  portrait_queen: { from: 'pill_bot', tint: 0xd23cff },
  bg_level4: { from: 'bg_house', procedural: true },
  bg_boss4: { from: 'bg_house', procedural: true },
  bg_level5: { from: 'bg_level3', hue: 35 },
  bg_boss5: { from: 'bg_boss3', hue: 35 },
  tex_l4_ground: { from: 'tex_house_ground', procedural: true },
  tex_l4_wall: { from: 'tex_house_wall', procedural: true },
  tex_l4_platform: { from: 'tex_house_platform', procedural: true },
  tex_l5_ground: { from: 'tex_l3_ground', hue: 35 },
  tex_l5_wall: { from: 'tex_l3_wall', hue: 35 },
  tex_l5_platform: { from: 'tex_l3_platform', hue: 35 },
  story_ch2_1: { from: 'story_ending' },
  story_ch2_2: { from: 'story_rescue_3' },
  // Level 6's detailed spec adds these aliases to the same fallback contract.
  bg_level6: { from: 'bg_level1' },
  tex_l6_ground: { from: 'tex_l1_ground', tint: 0x9a9a7a },
  tex_l6_wall: { from: 'tex_l1_wall', tint: 0x9a9a7a },
  tex_l6_platform: { from: 'tex_l3_platform' },
  story_ch2_river: { from: 'story_rescue_2' },
  hidden_bone: { from: 'golden_bone', tint: 0x70baff },
};

export const placeholderFor = (id) => Object.hasOwn(PLACEHOLDERS, id) ? PLACEHOLDERS[id] : null;
