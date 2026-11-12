// Control prompts for the device the player last used. Every prompt in the game is written for
// the keyboard; padPrompt() rewrites it for a pad player using the default layout in gamepad.js.
// Whole menu hints are listed first, then the phrases used in tutorials and dialogue. Exact
// phrases rather than single keys, so ordinary text is never rewritten.
// tests/pad-prompts.test.js checks that no keyboard key survives in any known prompt.

const k = (s) => `<span class="key">${s}</span>`;

// Menu hints shown by game.js, kept here so the pad rewrite cannot drift from the keyboard text.
export const HINTS = {
  title: 'Arrows/WASD move · Space jump · J/Shift bite · K/Ctrl slide &amp; belly flop · Esc pause · Gamepad supported',
  map: '◀ ▶ choose · SPACE / ENTER play · I wardrobe · X exchange · H exit to hub · ESC menu',
  trial: 'T: TIME TRIAL',
  exchange: '◀ ▶ amount · ENTER exchange · ESC close',
  exchangeLocked: 'ESC close',
  pause: '◀ ▶ adjust · ESC resume',
  pauseExit: 'ESC back',
  wardrobe: '↑↓ slot · ←→ item · ENTER / ESC close',
  cutscene: 'Any key: next · Esc: skip',
  sys: '↑↓ choose · ENTER select · ESC back',
  resultsMenu: 'ESC: menu',
};

export const PAD_PROMPTS = [
  // whole hints
  [HINTS.title, 'Stick / D-pad move · A jump · X bite · B slide &amp; belly flop · Right stick look · START pause'],
  [HINTS.map, '◀ ▶ choose · A play · LB wardrobe · LT exchange · B menu'],
  [HINTS.exchange, '◀ ▶ amount · A exchange · B close'],
  [HINTS.pause, '◀ ▶ adjust · B / START resume'],
  [HINTS.wardrobe, '↑↓ slot · ←→ item · A / B close'],
  [HINTS.cutscene, 'A: next · START: skip'],
  [HINTS.sys, '↑↓ choose · A select · B back'],
  [HINTS.resultsMenu, 'START: menu'],
  ['◀ ▶ choose · SPACE / ENTER select · L / E bark for Sniffer · ESC menu · BACKSPACE map', '◀ ▶ choose · A select · Y / VIEW Sniffer · START menu · B map'],
  ['◀ ▶ choose · SPACE / ENTER select · L / E bark for Sniffer · ESC back', '◀ ▶ choose · A select · Y / VIEW Sniffer · B back'],
  ['◀ ▶ choose · SPACE / ENTER play · ESC menu', '◀ ▶ choose · A play · B menu'],
  ['SPACE / ENTER enter · ESC menu', 'A enter · B menu'],
  ['SPACE / ENTER: continue', 'A: continue'],
  ['SPACE / ENTER: choose', 'A: choose'],
  ['SPACE: play · ESC: stop', 'A: play · B: stop'],
  [HINTS.trial, 'Y: TIME TRIAL'],
  ['G: Enter gauntlet', 'RB: Enter gauntlet'],
  ['R: Smog Remix', 'RT: Smog Remix'],
  [HINTS.exchangeLocked, 'B close'],
  [HINTS.pauseExit, 'B back'],
  ['PRESS ANY KEY', 'PRESS ANY BUTTON'],
  ['Press any key', 'Press any button'],
  // tutorial pop-ups (HTML key caps)
  [`${k('J')} or ${k('SHIFT')}`, k('X')],
  [`${k('K')} or ${k('CTRL')}`, k('B')],
  [`${k('K')} / ${k('CTRL')}`, k('B')],
  [`${k('L')} or ${k('E')}`, k('Y')],
  [`${k('U')} or ${k('Q')}`, k('LT')],
  [`${k('↓')} / ${k('S')}`, k('↓')],
  [k('SPACE'), k('A')],
  [k('J'), k('X')],
  // dialogue and banners (plain text)
  ['Bite with J or SHIFT', 'Bite with X'],
  ['Ctrl or K, then SPACE', 'B, then A'],
  ['Ctrl or K', 'B'],
  ['Press L or E', 'Press Y'],
  ['with SPACE', 'with A'],
  ['Press SPACE', 'Press A'],
  ['hold SPACE', 'hold A'],
  ['SPACE hops', 'A hops'],
];

/** Rewrite keyboard prompts in a string for a pad player. */
export function padPrompt(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const [from, to] of PAD_PROMPTS) if (out.includes(from)) out = out.split(from).join(to);
  return out;
}
