// In-game feedback window: press N twice (or SEND FEEDBACK in the pause menu). The window itself
// lives in the hub SDK (metaverse-hub docs/feedback.md); this file is NOBU's adapter. It tells the
// SDK how to freeze and unfreeze the game, what "right now" looks like, and how the window should
// look. Standalone or offline play has no hub session, so the SDK only shows a one-line toast.
import { feedbackTransportFromSdk, installFeedback } from '@metaverse/hub-sdk';
import { save } from '../core/save.js';
import { crashGuard } from '../core/crashGuard.js';
import { trialLayout, trialVariant } from '../config/trials.js';
import { hub } from './hubBridge.js';

/* global __NOBU_VERSION__ */
/** package.json version plus the short commit, from vite.config.js. */
export const BUILD_VERSION = typeof __NOBU_VERSION__ === 'string' ? __NOBU_VERSION__ : 'dev';

const ERROR_MAX = 10;
const round = (n, places = 2) => (Number.isFinite(n) ? Math.round(n * 10 ** places) / 10 ** places : null);
const point = (p) => (p ? { x: round(p.x), y: round(p.y), z: round(p.z) } : null);

function sessionMode(s) {
  if (!s) return 'menu';
  if (s.rush) return 'boss rush';
  if (s.trial) return 'time trial';
  if (s.remix) return 'smog remix';
  if (s.def?.gauntlet) return 'box gauntlet';
  return s.def?.bonus ? 'bonus stage' : 'story';
}

/** What the game looks like right now. Reads only; a missing session or player leaves fields out. */
export function feedbackContext(game) {
  const s = game.session, p = game.player, d = save.data || {};
  const live = !!s && !s.disposed && ['play', 'pause', 'complete', 'gameover'].includes(game.state);
  const extra = { screen: game.state, godMode: !!d.godMode, pixelated: !!d.pixelated, nobuModel: d.nobuModel, hub: hub.reach };
  if (game.state === 'map') extra.mapSelection = String(game.mapSel ?? '');
  if (!live) return { level: '', mode: 'menu', extra };

  const layout = s.trial ? trialLayout(s.level) : 1;
  Object.assign(extra, {
    levelName: s.def?.name || '',
    layout,
    variant: s.trial ? trialVariant(s.level, layout) : String(s.level),
    phase: s.phase,
    tier: s.def?.tier ?? null,
    godUsed: !!s.godUsed,
    busy: !!s.busy,
    talking: !!game.ui?.talking,
  });
  if (s.trial) extra.freezeMs = Math.round(s.freezeMs || 0);
  const boss = s.phase === 'boss' ? s.boss : null;
  if (boss) {
    extra.boss = { key: boss.key || s.def?.bossKey || '', phase: boss.phase, hp: boss.hp, maxHp: boss.maxHp, state: String(boss.state ?? ''), stageDeaths: s.bossStageDeaths || 0 };
    if (boss.dda) extra.bossHelp = { tele: boss.dda.tele, window: boss.dda.window };
  }

  const clock = s.trial ? s.trialT : s.def?.gauntlet ? s.gauntletT : s.phase === 'boss' ? s.bossClock : null;
  return {
    level: String(s.level),
    mode: sessionMode(s),
    ...(p?.pos ? { position: point(p.pos) } : {}),
    ...(Number.isFinite(clock) ? { gameTime: clock } : {}),
    player: {
      masks: s.mask,
      lives: d.lives,
      tickets: d.tickets,
      levelTickets: s.levelTickets,
      snacks: s.snack?.raw ?? 0,
      snackPotential: s.snack?.potential ?? 0,
      dogsFreed: s.freedIds?.size ?? 0,
      dogsTotal: s.dogsTotal ?? 0,
      deaths: s.deaths,
      deathsAtCheckpoint: s.deathsAtCp,
      checkpoint: point(s.cp?.pos),
      grounded: !!p?.grounded,
      state: p?.mode ?? '',
      dead: !!p?.dead,
      frozen: !!p?.frozen,
      velocity: point(p?.vel),
      riding: !!p?.ride,
    },
    extra,
  };
}

// Colours and fonts from src/ui/style.css (the fonts are loaded by index.html for the whole page).
const THEME = {
  font: "'Baloo 2', 'Trebuchet MS', 'Arial Rounded MT Bold', sans-serif",
  titleFont: "'Luckiest Guy', 'Arial Black', Impact, sans-serif",
  background: 'rgba(18, 5, 31, 0.72)',
  panel: '#3b1666',
  text: '#fff6e3',
  muted: '#d9c4f0',
  accent: '#ffc21a',
  accentText: '#1a0a24',
  border: '#1a0a24',
  radius: '12px',
  css: `
.panel { border-width: 3px; box-shadow: 0 6px 0 #1a0a24, 0 18px 60px rgba(0, 0, 0, 0.55); font-weight: 600; }
.title { font-size: 26px; font-weight: 400; letter-spacing: 1px; color: #ffc21a; -webkit-text-stroke: 1.5px #1a0a24; paint-order: stroke fill; text-shadow: 0 3px 0 #1a0a24; }
.chip, .btn, .mini, textarea, .shot { border-width: 2px; }
.chip, .btn { background: #5a2399; }
.btn.primary { font-family: 'Luckiest Guy', 'Arial Black', Impact, sans-serif; font-weight: 400; letter-spacing: 1px; box-shadow: 0 3px 0 #1a0a24; }
.toast { border-width: 2px; }`,
};

/**
 * Install the feedback shortcut for this game. Call once at startup; returns the SDK handle
 * (open, close, isOpen, breadcrumb, dispose). `transport` is replaceable for tests.
 */
export function installGameFeedback(game, { transport = feedbackTransportFromSdk(hub.sdk) } = {}) {
  // The crash guard keeps no list of its own, so remember the last few errors it reports.
  const errors = [];
  const stopErrors = crashGuard.onCrash((info) => {
    errors.push({ message: `${info.source}: ${info.message}`, stack: info.stack, at: Math.round(performance.now()) });
    if (errors.length > ERROR_MAX) errors.shift();
  });
  const handle = installFeedback({
    title: 'NOBU: Saviour Dog',
    version: BUILD_VERSION,
    transport,
    // The loop stops updating in whatever state it is in, so the game's own pause menu never
    // opens over the window and closing it leaves the exact screen the player was on.
    pause: () => game.hold(),
    resume: (token) => game.release(token),
    context: () => feedbackContext(game),
    // No preserveDrawingBuffer: draw the current frame again right before the canvas is read.
    beforeCapture: () => { if (game.ui) game.render(); },
    canvases: () => [game.canvas],
    errors: () => errors.slice(),
    theme: THEME,
  });
  return { ...handle, dispose() { stopErrors(); handle.dispose(); } };
}
