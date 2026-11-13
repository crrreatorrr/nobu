// NOBU's save, split by who owns each part (every storage access is wrapped; the game runs without it).
//
// - Progress (story unlocks, clears, dogs, bones, trials, medals...) lives in one hub-SDK progress
//   store. Outside a hub session it belongs to this browser (PROGRESS_KEY). In a hub session it
//   belongs to the hub account: `${PROGRESS_KEY}@<playerId>` here plus the account's cloud save, so
//   it follows the account to any device. Progress only advances: every copy (other tabs, other
//   devices, the cloud) is combined with mergeProgress, which keeps the better of everything.
//   NEW GAME is the one way back: it starts a new playthrough (`playthrough` + 1), and story
//   progress from an older playthrough loses to the newer one. Trial and mastery records survive it.
// - Settings (volumes, rumble, model, pixels, God Mode) belong to this browser: SETTINGS_KEY.
// - The local wallet, lives, the last level and its misses, the gear loadout and the Kennel look
//   can go down or are per run, so they never sync. Each owner keeps its own copy in this browser:
//   LOCAL_KEY for play outside the hub, `${LOCAL_KEY}@<playerId>` for each hub account, so a new
//   account never starts with another player's wallet or gear. In a hub session the wallet mirrors
//   the server balance anyway (src/hub/hubBridge.js).
//
// The single save NOBU used before (SAVE_KEY) is only read now. Its progress stays with this
// browser (readLegacy merges it into the device copy, never into an account), and its settings and
// wallet seed SETTINGS_KEY and LOCAL_KEY the first time those are missing.
//
// `save.data` is the game's working copy of all three, as before. The game changes it and calls
// `save.write()`, which commits progress through the store's `update` (so a change can only keep or
// improve progress) and stores settings and the local part.
import { createProgressStore } from '@metaverse/hub-sdk';
import { TRIAL_FLOOR_MS, TRIAL_LEVELS, LOCAL_TRIAL_LEVELS, trialMedal, trialLayout, trialVariant } from '../config/trials.js';
import { LEVEL_IDS, LEVEL_DOGS } from '../levels/metadata.js';
import { trialMastery, mergeTrialMastery } from '../game/mastery.js';
import { KENNEL_MILESTONES, kennelUnlocks } from '../game/progress.js';
import { TUTORIALS } from '../story/script.js';
import { withOriginLock } from './originLock.js';

/** The single save before progress moved to the store. Read only. */
export const SAVE_KEY = 'nobu-saviour-dog-save-v1';
// A legacy save that does not parse is copied here, so it is never lost outright.
export const CORRUPT_KEY = `${SAVE_KEY}.corrupt`;
/** Progress of play outside the hub. An account's copy is `${PROGRESS_KEY}@<playerId>`. */
export const PROGRESS_KEY = 'nobu-saviour-dog-progress-v1';
/** Wallet, lives and run state of play outside the hub. An account's copy is `${LOCAL_KEY}@<playerId>`. */
export const LOCAL_KEY = 'nobu-saviour-dog-local-v1';
/** This browser's settings. */
export const SETTINGS_KEY = 'nobu-saviour-dog-settings-v1';

export const START_LIVES = 4;

function fresh() {
  return {
    unlocked: 1,             // highest level the player may enter (1..3)
    open: { '1': true },
    beaten: {},
    bones: {},                  // Golden Bone rewards (all breakables + all dogs)
    bestDogs: {},
    boneBoard: {},
    dogsFreed: {},
    bestChain: {},
    chainBadges: {},
    bossMedals: {},
    perfect: {},
    remix: {},
    rush: { clear: false, noHit: false, bestMs: null },
    kennel: { seen: 0, buddy: null, tint: null, goldenSeen: false, seenMilestones: {} },
    trialsClassic: {},
    gauntlets: {},
    lastMiss: {},
    secretSeen: false,
    lives: START_LIVES,
    tickets: 0,
    seenIntro: false,
    finished: false,
    seenCh2: false,
    lastLevel: 1,
    tutorials: {},
    nobuModel: 'glb',        // 'glb' (Higgsfield 3D) or 'classic' (primitives)
    pixelated: false,
    godMode: false,          // title-screen cheat: no damage + 4 jumps in a row
    // Equip choice only. Ownership is not stored here; effects are derived at runtime.
    loadout: { slots: { head: null, neck: null, back: null, body: null } },
    bonus: {},               // bonus stages: { ride: { beaten, best, found }, cave: {...} }
    // time trials: { 1: { best: seconds, ms, medal, at, deaths, freezeMs, pid } }
    // `ms` (integer) is the source of truth; `best` stays for the UI. `pid` is the hub player
    // that set it, or null when it was set standalone or in god mode (never uploaded).
    trials: {},
    colorBones: {},          // colored bones found: { red: true, blue: true }
    playthrough: 0,          // NEW GAMEs started; story progress of an older playthrough never returns
    v: 3,
    musicVol: 0.6,
    sfxVol: 0.8,
    rumble: true,            // gamepad rumble (pause menu)
  };
}

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v, dflt) => (Number.isFinite(v) ? v : dflt);
const count = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
const whole = (v) => (Number.isInteger(v) && v > 0 ? v : 0);
const clone = (v) => JSON.parse(JSON.stringify(v));

function sanitizeTrial(level, e, layout = trialLayout(level)) {
  if (!isObj(e) || (e.layout ?? 1) !== layout) return null;
  const variant = trialVariant(level, layout);
  const ms = Number.isInteger(e.ms) ? e.ms : Number.isFinite(e.best) ? Math.round(e.best * 1000) : NaN;
  // Below the hub floor is not a time anyone can play, so it is a bad value, not a record.
  if (!(ms >= TRIAL_FLOOR_MS[variant])) return null;
  const best = Number.isFinite(e.best) && Math.round(e.best * 1000) === ms ? e.best : ms / 1000;
  const out = { best, ms, medal: trialMedal(variant, best), layout };
  if (Number.isFinite(e.at)) out.at = e.at;
  if (Number.isInteger(e.deaths) && e.deaths >= 0) out.deaths = e.deaths;
  if (Number.isFinite(e.freezeMs) && e.freezeMs >= 0) out.freezeMs = Math.round(e.freezeMs);
  out.pid = typeof e.pid === 'string' && e.pid ? e.pid.slice(0, 64) : null;
  return trialMastery(variant, { ...out, godUsed: e.godUsed === true, bestEligibleMs: e.bestEligibleMs, pid: e.godUsed === true ? null : out.pid });
}

export function sanitizeTrials(raw, layout) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const level of LOCAL_TRIAL_LEVELS) {
    const e = sanitizeTrial(level, raw[level], layout ?? trialLayout(level));
    if (e) out[level] = e;
  }
  return out;
}

// Layout changes can happen after v3 has already shipped, so this migration is
// independent of the save-version migration. Unextended levels keep their records.
export function migrateTrialLayouts(trials, classic) {
  const current = sanitizeTrials(trials);
  const archive = sanitizeTrials(classic, 1);
  for (const level of LOCAL_TRIAL_LEVELS) {
    if (trialLayout(level) === 1) continue;
    const old = sanitizeTrial(level, trials?.[level], 1);
    if (old) archive[level] = mergeTrialMastery(trialVariant(level, 1), archive[level], old);
  }
  return { trials: current, trialsClassic: archive };
}

const OPEN_IDS = [...LEVEL_IDS, 'kennel', 'g1', 'g2', 'g3'];
const BOSS_KEYS = ['bird', 'cat', 'cone', 'titan', 'queen'];
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const GAUNTLET_IDS = ['g1', 'g2', 'g3'];
const GAUNTLET_FLAGS = ['found', 'polaroid', 'clear', 'allBoxes', 'flawless', 'noDeath', 'firstPaid'];
// `tallySeen` is the level-complete tally's first-time card (src/game/completeTally.js).
const TUTORIAL_IDS = [...Object.keys(TUTORIALS), 'tallySeen'];
const DOG_ID = /^(1|2|3|4|5|6|ride|cave):[a-z]+-[a-z0-9]+$/;
const KNOWN_DOGS = Object.entries(LEVEL_DOGS).flatMap(([id, dogs]) => Object.keys(dogs).map((dog) => `${id}:${dog}`));
const boolMap = (v, ids = LEVEL_IDS) => Object.fromEntries(ids.filter((id) => isObj(v) && v[id] === true).map((id) => [id, true]));
const countMap = (v) => Object.fromEntries(LEVEL_IDS.map((id) => [id, count(isObj(v) ? v[id] : 0)]).filter(([, n]) => n > 0));
const bestMs = (v, min = 1) => Number.isInteger(v) && v >= min ? v : null;
const minTime = (a, b) => a == null ? b : b == null ? a : Math.min(a, b);
const board = (v) => ({ golden: v?.golden === true, goodBoy: v?.goodBoy === true, hidden: v?.hidden === true,
  snack: Math.min(3, Math.max(0, Math.floor(finite(v?.snack, 0)))) });
const medal = (v) => ({ clear: v?.clear === true, noHit: v?.noHit === true, speed: v?.speed === true, bestMs: bestMs(v?.bestMs) });
const entriesFor = (raw, ids, clean) => Object.fromEntries(ids.filter((id) => isObj(raw) && isObj(raw[id])).map((id) => [id, clean(raw[id])]));

// Bonus stages (ride, cave): found, beaten and the best haul. Nothing else is kept.
const bonusRecord = (v) => {
  const rec = {};
  if (v.found === true) rec.found = true;
  if (v.beaten === true) rec.beaten = true;
  if ('best' in v) rec.best = count(v.best);
  return rec;
};
const sanitizeBonus = (raw) => entriesFor(raw, LEVEL_IDS, bonusRecord);

function sanitizeGauntlets(raw) {
  return entriesFor(raw, GAUNTLET_IDS, (v) => {
    // The rewards and box specs name these flags differently. Keep both spellings
    // in sync so either consumer preserves the same permanent mastery record.
    const found = v.found === true || v.polaroid === true;
    const flawless = v.flawless === true || v.noDeath === true;
    return { found, polaroid: found, clear: v.clear === true, allBoxes: v.allBoxes === true,
      flawless, noDeath: flawless, firstPaid: v.firstPaid === true, bestMs: bestMs(v.bestMs, 1000) };
  });
}

// Every known dog, plus a few well-formed ids this build does not know yet (a newer tab's dogs),
// so an older tab never erases them. The cap keeps a damaged save from outgrowing the cloud save.
const FUTURE_DOGS_MAX = 16;
function sanitizeDogs(raw) {
  const freed = Object.entries(isObj(raw) ? raw : {}).filter(([id, v]) => v === true && DOG_ID.test(id));
  const known = new Set(KNOWN_DOGS);
  const future = freed.filter(([id]) => !known.has(id) && id.length <= 24).map(([id]) => id).sort().slice(0, FUTURE_DOGS_MAX);
  return Object.fromEntries([...freed.filter(([id]) => known.has(id)).map(([id]) => id), ...future].map((id) => [id, true]));
}

function sanitizeMiss(raw) {
  return entriesFor(raw, LEVEL_IDS, (v) => Object.fromEntries(Object.entries(v)
    .filter(([, n]) => Number.isFinite(n) && n > 0).slice(0, 12)
    .map(([name, n]) => [name.slice(0, 40), Math.floor(n)])));
}

// Old saves remember counts, not individual dogs. Map the first n stable ids in
// authoring order once, before sanitizing. Never reinterpret a v3 keyed save.
export function migrateSave(old) {
  if (old.v >= 3) return old;
  const out = { ...old };
  const legacy = (v, counts = false) => Array.isArray(v)
    ? Object.fromEntries(v.slice(0, 3).map((n, i) => [String(i + 1), counts ? count(n) : !!n]).filter(([, n]) => n))
    : v;
  out.beaten = boolMap(legacy(old.beaten));
  out.bones = boolMap(legacy(old.bones));
  out.bestDogs = countMap(legacy(old.bestDogs, true));
  out.boneBoard = { ...(isObj(old.boneBoard) ? old.boneBoard : {}) };
  for (const id of LEVEL_IDS) if (out.bones?.[id]) out.boneBoard[id] = { ...board(out.boneBoard[id]), golden: true };
  out.open = { ...boolMap(old.open, OPEN_IDS), '1': true };
  const unlocked = Math.min(3, Math.max(1, Math.floor(finite(old.unlocked, 1))));
  for (let id = 1; id <= unlocked; id++) out.open[id] = true;
  for (const [id, after] of [['ride', '1'], ['cave', '2']]) {
    if (out.beaten?.[after] || old.bonus?.[id]?.found || old.bonus?.[id]?.beaten) out.open[id] = true;
  }
  out.dogsFreed = { ...(isObj(old.dogsFreed) ? old.dogsFreed : {}) };
  for (const id of ['1', '2', '3']) {
    const n = count(out.bestDogs?.[id]);
    if (n > 0) out.open.kennel = true;
    for (const dog of Object.keys(LEVEL_DOGS[id]).slice(0, Math.floor(n))) out.dogsFreed[`${id}:${dog}`] = true;
  }
  out.unlocked = unlocked;
  if (!(old.v >= 2)) out.pixelated = false; // retain the original v1 rendering migration
  out.v = 3;
  return out;
}

function sanitize(d) {
  const f = fresh();
  d.seenCh2 = d.seenCh2 === true;
  d.seenIntro = d.seenIntro === true;
  d.finished = d.finished === true;
  d.playthrough = whole(d.playthrough);
  Object.assign(d, migrateTrialLayouts(d.trials, d.trialsClassic));
  d.bestDogs = countMap(d.bestDogs);
  d.bestChain = countMap(d.bestChain);
  d.bonus = sanitizeBonus(d.bonus);
  for (const k of ['beaten', 'bones', 'perfect', 'chainBadges']) d[k] = boolMap(d[k]);
  d.open = { ...boolMap(d.open, OPEN_IDS), '1': true };
  d.boneBoard = entriesFor(d.boneBoard, LEVEL_IDS, board);
  d.bossMedals = entriesFor(d.bossMedals, BOSS_KEYS, medal);
  d.remix = entriesFor(d.remix, LEVEL_IDS, (v) => ({ golden: v.golden === true }));
  d.rush = { clear: d.rush?.clear === true, noHit: d.rush?.noHit === true, bestMs: bestMs(d.rush?.bestMs) };
  d.dogsFreed = sanitizeDogs(d.dogsFreed);
  d.gauntlets = sanitizeGauntlets(d.gauntlets);
  d.lastMiss = sanitizeMiss(d.lastMiss);
  d.secretSeen = d.secretSeen === true;
  const kennel = isObj(d.kennel) ? d.kennel : {};
  d.kennel = { goldenSeen: kennel.goldenSeen === true, seen: Math.min(6, Math.max(0, Math.floor(finite(kennel.seen, 0)))),
    buddy: ['shiba', 'pug', 'dalmatian', 'corgi'].includes(kennel.buddy) ? kennel.buddy : null,
    tint: ['cream', 'shadow', 'ginger', 'chompGold'].includes(kennel.tint) ? kennel.tint : null };
  const earned = kennelUnlocks(d, KNOWN_DOGS.length, KNOWN_DOGS.filter((id) => d.dogsFreed[id]).length);
  d.kennel.seenMilestones = isObj(kennel.seenMilestones)
    ? boolMap(kennel.seenMilestones, KENNEL_MILESTONES.map((m) => m.id))
    : Object.fromEntries(earned.slice(0, d.kennel.seen).map((id) => [id, true]));
  d.unlocked = Math.min(3, Math.max(1, Math.floor(finite(d.unlocked, 1))));
  d.lives = finite(d.lives, f.lives);
  d.tickets = finite(d.tickets, 0);
  d.lastLevel = finite(d.lastLevel, 1);
  d.musicVol = finite(d.musicVol, f.musicVol);
  d.sfxVol = finite(d.sfxVol, f.sfxVol);
  d.rumble = d.rumble !== false;
  d.nobuModel = d.nobuModel === 'classic' ? 'classic' : 'glb';
  d.pixelated = d.pixelated === true;
  d.godMode = d.godMode === true;
  d.tutorials = boolMap(d.tutorials, TUTORIAL_IDS);
  d.colorBones = boolMap(d.colorBones, COLORS);
  if (!isObj(d.loadout)) d.loadout = f.loadout;
  return d;
}

/** Any stored or in-memory save (any version, any owner's part) as a whole sanitized save. Never throws. */
function readWhole(raw) {
  try {
    const src = isObj(raw) ? clone(raw) : {};
    return sanitize({ ...fresh(), ...migrateSave(src) });
  } catch {
    return sanitize(fresh());
  }
}

// ---------------------------------------------------------------- progress

// Story progress belongs to one playthrough: NEW GAME clears it.
const STORY_FIELDS = ['unlocked', 'open', 'beaten', 'bones', 'bestDogs', 'boneBoard', 'dogsFreed', 'bestChain',
  'chainBadges', 'remix', 'kennel', 'bonus', 'colorBones', 'secretSeen', 'seenIntro', 'finished', 'seenCh2', 'tutorials'];
// Trial and mastery records are permanent: NEW GAME keeps them.
const MASTERY_FIELDS = ['trials', 'trialsClassic', 'bossMedals', 'perfect', 'rush', 'gauntlets'];
const SETTINGS_FIELDS = ['musicVol', 'sfxVol', 'rumble', 'nobuModel', 'pixelated', 'godMode'];

/** The progress part of a sanitized save. The Kennel's buddy and fur are a look, kept locally. */
function pickProgress(d) {
  const out = { v: 3, playthrough: d.playthrough };
  for (const k of [...STORY_FIELDS, ...MASTERY_FIELDS]) out[k] = d[k];
  out.kennel = { seen: d.kennel.seen, goldenSeen: d.kennel.goldenSeen, seenMilestones: d.kennel.seenMilestones };
  return out;
}

export const normalizeProgress = (raw) => pickProgress(readWhole(raw));

const union = (a, b) => ({ ...a, ...b });
const maxMap = (a, b) => {
  const out = { ...a };
  for (const [id, n] of Object.entries(b)) out[id] = Math.max(count(out[id]), n);
  return out;
};
const perId = (a, b, both) => {
  const out = { ...a, ...b };
  for (const id of Object.keys(a)) if (id in b) out[id] = both(a[id], b[id]);
  return out;
};
// Canonical JSON (sorted keys), to order two otherwise equal records the same way every time.
const canonical = (v) => JSON.stringify(v, (_k, x) => (isObj(x) ? Object.fromEntries(Object.entries(x).sort(([p], [q]) => (p < q ? -1 : p > q ? 1 : 0))) : x));

function mergeTrials(a, b) {
  const out = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    let x = a[id], y = b[id];
    // mergeTrialMastery keeps its first record on a full tie, so tied records go in a fixed order.
    if (x && y && canonical(y) < canonical(x)) [x, y] = [y, x];
    const e = mergeTrialMastery(trialVariant(id, (x ?? y).layout ?? 1), x, y);
    if (e) out[id] = e;
  }
  return out;
}

function mergeStory(a, b) {
  return {
    unlocked: Math.max(a.unlocked, b.unlocked),
    open: union(a.open, b.open),
    beaten: union(a.beaten, b.beaten),
    bones: union(a.bones, b.bones),
    bestDogs: maxMap(a.bestDogs, b.bestDogs),
    boneBoard: perId(a.boneBoard, b.boneBoard, (x, y) => ({ golden: x.golden || y.golden, goodBoy: x.goodBoy || y.goodBoy,
      hidden: x.hidden || y.hidden, snack: Math.max(x.snack, y.snack) })),
    dogsFreed: sanitizeDogs(union(a.dogsFreed, b.dogsFreed)), // the same first future ids in any order
    bestChain: maxMap(a.bestChain, b.bestChain),
    chainBadges: union(a.chainBadges, b.chainBadges),
    remix: perId(a.remix, b.remix, (x, y) => ({ golden: x.golden || y.golden })),
    kennel: { seen: Math.max(a.kennel.seen, b.kennel.seen), goldenSeen: a.kennel.goldenSeen || b.kennel.goldenSeen,
      seenMilestones: union(a.kennel.seenMilestones, b.kennel.seenMilestones) },
    bonus: perId(a.bonus, b.bonus, (x, y) => bonusRecord({ found: x.found || y.found, beaten: x.beaten || y.beaten,
      ...('best' in x || 'best' in y ? { best: Math.max(count(x.best), count(y.best)) } : {}) })),
    colorBones: union(a.colorBones, b.colorBones),
    secretSeen: a.secretSeen || b.secretSeen,
    seenIntro: a.seenIntro || b.seenIntro,
    finished: a.finished || b.finished,
    seenCh2: a.seenCh2 || b.seenCh2,
    tutorials: union(a.tutorials, b.tutorials),
  };
}

function mergeMastery(a, b) {
  return {
    trials: mergeTrials(a.trials, b.trials),
    trialsClassic: mergeTrials(a.trialsClassic, b.trialsClassic),
    bossMedals: perId(a.bossMedals, b.bossMedals, (x, y) => ({ clear: x.clear || y.clear, noHit: x.noHit || y.noHit,
      speed: x.speed || y.speed, bestMs: minTime(x.bestMs, y.bestMs) })),
    perfect: union(a.perfect, b.perfect),
    rush: { clear: a.rush.clear || b.rush.clear, noHit: a.rush.noHit || b.rush.noHit, bestMs: minTime(a.rush.bestMs, b.rush.bestMs) },
    gauntlets: perId(a.gauntlets, b.gauntlets, (x, y) => ({
      ...Object.fromEntries(GAUNTLET_FLAGS.map((k) => [k, x[k] || y[k]])), bestMs: minTime(x.bestMs, y.bestMs) })),
  };
}

/**
 * Combines two normalized progress copies without losing anything either earned. Commutative,
 * associative and idempotent. Story progress of an older playthrough gives way to the newer one.
 */
export function mergeProgress(a, b) {
  const story = a.playthrough === b.playthrough ? mergeStory(a, b)
    : Object.fromEntries(STORY_FIELDS.map((k) => [k, (a.playthrough > b.playthrough ? a : b)[k]]));
  return clone({ v: 3, playthrough: Math.max(a.playthrough, b.playthrough), ...story, ...mergeMastery(a, b) });
}

// The cloud form drops what normalize derives again (a trial's seconds and medal come from `ms`).
function toCloud(p) {
  const out = clone(p);
  for (const k of ['trials', 'trialsClassic']) {
    for (const e of Object.values(out[k])) { delete e.best; delete e.medal; }
  }
  return out;
}

export const progressModel = { empty: () => normalizeProgress(null), normalize: normalizeProgress, merge: mergeProgress, toCloud };

// ---------------------------------------------------------------- storage

// Looked up on each call, so a browser without storage (or a test's stub) is handled where used.
const browserStorage = {
  getItem: (k) => globalThis.localStorage.getItem(k),
  setItem: (k, v) => globalThis.localStorage.setItem(k, v),
  removeItem: (k) => globalThis.localStorage.removeItem(k),
};

function readJson(key) {
  try {
    const raw = browserStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isObj(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    browserStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // storage full or unavailable: this visit keeps it in memory
  }
}

let legacyCache = { raw: undefined, save: null };
/** The pre-store save, sanitized, or null. An unreadable one is copied to CORRUPT_KEY once. */
function readLegacySave() {
  let raw;
  try { raw = browserStorage.getItem(SAVE_KEY); } catch { return null; }
  if (raw === legacyCache.raw) return legacyCache.save;
  let parsed = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
      if (!isObj(parsed)) throw new Error('save is not an object');
    } catch {
      parsed = null;
      try {
        if (browserStorage.getItem(CORRUPT_KEY) !== raw) browserStorage.setItem(CORRUPT_KEY, raw);
      } catch { /* storage full or unavailable */ }
      console.warn('[save] unreadable save kept in', CORRUPT_KEY);
    }
  }
  legacyCache = { raw, save: parsed ? readWhole(parsed) : null };
  return legacyCache.save;
}

const localKeyFor = (owner) => owner.kind === 'device' ? LOCAL_KEY : owner.kind === 'account' ? `${LOCAL_KEY}@${owner.playerId}` : null;
const ownerId = (owner) => owner.kind === 'account' ? `account:${owner.playerId}` : owner.kind;

/** Local part: wallet, lives, run state, gear and the Kennel look. */
function pickLocal(d) {
  return { tickets: d.tickets, lives: d.lives, lastLevel: d.lastLevel, lastMiss: d.lastMiss, loadout: d.loadout,
    kennel: { buddy: d.kennel?.buddy ?? null, tint: d.kennel?.tint ?? null } };
}
const pickSettings = (d) => Object.fromEntries(SETTINGS_FIELDS.map((k) => [k, d[k]]));

/** This owner's local part. The device's comes from the legacy save until it has its own. */
function readLocal(owner) {
  const key = localKeyFor(owner);
  if (!key) return null;
  const stored = readJson(key);
  if (stored) return pickLocal(readWhole({ v: 3, ...stored }));
  if (owner.kind === 'device') {
    const legacy = readLegacySave();
    if (legacy) return pickLocal(legacy);
  }
  return null;
}

function readSettings() {
  const stored = readJson(SETTINGS_KEY);
  if (stored) return pickSettings(readWhole({ v: 3, ...stored }));
  const legacy = readLegacySave();
  return pickSettings(legacy ?? readWhole(null));
}

// ---------------------------------------------------------------- the save

let data = fresh();
let store = null;
let unsubscribe = null;
let currentOwner = 'device';
let committing = false;
let localDurable = true;
const listeners = new Set();

/** Copies stored progress into the working copy, keeping the Kennel look (it is local). */
function adoptProgress(p) {
  const look = { buddy: data.kennel?.buddy ?? null, tint: data.kennel?.tint ?? null };
  Object.assign(data, clone(p));
  data.kennel = { ...data.kennel, ...look };
}

function adoptLocal(local) {
  const l = local ?? pickLocal(fresh());
  Object.assign(data, clone({ tickets: l.tickets, lives: l.lives, lastLevel: l.lastLevel, lastMiss: l.lastMiss, loadout: l.loadout }));
  data.kennel = { ...data.kennel, buddy: l.kennel.buddy, tint: l.kennel.tint };
}

function onStoreChange() {
  const owner = store.owner();
  if (ownerId(owner) !== currentOwner) {
    // Another owner: its progress and local part replace this one's. Nothing carries over.
    currentOwner = ownerId(owner);
    adoptProgress(store.get());
    adoptLocal(readLocal(owner));
  } else {
    // Same owner (another tab, the cloud, or this write): keep unsaved changes, add what arrived.
    adoptProgress(mergeProgress(normalizeProgress(data), store.get()));
  }
  if (!committing) for (const listener of listeners) listener();
}

function openStore() {
  unsubscribe?.();
  store = createProgressStore({
    key: PROGRESS_KEY,
    model: progressModel,
    storage: browserStorage,
    // Progress from before the store belongs to this browser only.
    readLegacy: () => { const legacy = readLegacySave(); return legacy ? pickProgress(legacy) : null; },
    onError: (error) => console.warn('[save] progress could not sync with the hub', error),
  });
  currentOwner = ownerId(store.owner());
  unsubscribe = store.subscribe(onStoreChange);
}

function levelValue(map, id) {
  const key = String(id);
  if (Array.isArray(map)) return /^[1-3]$/.test(key) ? map[Number(key) - 1] : undefined;
  return map?.[key];
}

/** Commits the working copy: progress through the store, then settings and this owner's local part. */
function commit() {
  const key = localKeyFor(store.owner());
  localDurable = writeJson(SETTINGS_KEY, pickSettings(data)) && (!key || writeJson(key, pickLocal(data)));
  committing = true;
  try {
    store.update(() => normalizeProgress(data));
  } finally {
    committing = false;
  }
}

openStore();

export const save = {
  get data() { return data; },
  /** Opens this browser's save (play outside the hub) from storage. Call once at boot, before hold(). */
  load() {
    openStore();
    data = fresh();
    Object.assign(data, readSettings());
    adoptProgress(store.get());
    adoptLocal(readLocal(store.owner()));
    return data;
  },
  /** Stores the working copy. Progress can only keep or improve; `progressOnly` keeps another tab's newer wallet. */
  write({ progressOnly = false } = {}) {
    if (progressOnly) {
      // Non-economic modes must not overwrite another tab's newer wallet.
      // This refresh does not restore lives, checkpoints or whole-save state.
      const disk = readLocal(store.owner());
      if (disk) data.tickets = disk.tickets;
    }
    commit();
  },
  // Gauntlets have no run pickups: reconcile the latest durable wallet before
  // claiming the once-only reward, without replacing lives, checkpoints or run state.
  withGauntletEnd(mutator, { shouldCommit = () => true } = {}) {
    if (typeof mutator !== 'function' || mutator.constructor.name === 'AsyncFunction') throw new TypeError('Gauntlet transaction must be synchronous');
    return withOriginLock('nobu-gauntlet-end-v1', () => {
      if (!shouldCommit()) return { cancelled: true, tickets: 0, medals: [], claimDurable: false };
      store.refresh();
      const disk = readLocal(store.owner());
      if (disk) data.tickets = disk.tickets; // Current wallet read, before the canonical credit path.
      const result = mutator(data);
      if (result && typeof result.then === 'function') throw new TypeError('Gauntlet transaction must be synchronous');
      commit();
      const claimDurable = GAUNTLET_IDS.includes(result?.id) && localDurable && store.persistent()
        && store.get().gauntlets?.[result.id]?.firstPaid === true;
      return { ...result, claimDurable };
    });
  },
  // New game clears story progress; trial and mastery records, settings and gear stay.
  reset() {
    commit();
    const loadout = data.loadout;
    committing = true;
    try {
      store.update((current) => ({ ...normalizeProgress(null), ...Object.fromEntries(MASTERY_FIELDS.map((k) => [k, current[k]])),
        playthrough: current.playthrough + 1 }));
    } finally {
      committing = false;
    }
    adoptProgress(store.get());
    adoptLocal({ ...pickLocal(fresh()), loadout });
    commit();
  },

  // ---- whose progress this is (src/hub/hubBridge.js)
  /** A hub visit is starting: progress stays in memory until attach() or release(). */
  hold() {
    if (store.owner().kind === 'pending') return;
    commit();
    store.hold();
  },
  /** The hub session is live: progress from now on (and any held) belongs to this player. */
  attach(cloud, playerId) {
    commit();
    return store.attach(cloud, playerId);
  },
  /** No hub session after all: back to this browser's progress. Held progress stays here. */
  release() {
    if (store.owner().kind === 'device') return;
    commit();
    store.release();
  },
  /** Pushes unsynced account progress to the cloud now. */
  flush() { return store.flush(); },
  owner() { return store.owner(); },
  sync() { return store.sync(); },
  /** Another tab changed localStorage. */
  storageChanged(key) { if (store.watches(key)) store.refresh(); },
  /** Called when progress changes from elsewhere: another owner, another tab, or the cloud. */
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },

  /** Sum of current public-level trial bests in ms, or null until all exist. */
  totalTrialMs() {
    let sum = 0;
    for (const level of TRIAL_LEVELS) {
      const ms = data.trials?.[level]?.ms;
      if (!Number.isInteger(ms)) return null;
      sum += ms;
    }
    return sum;
  },
  // Legacy arrays are accepted at this read boundary for old callers during the
  // migration; persisted v3 state and every new write use keyed maps.
  beatenOf(id) { return !!levelValue(data.beaten, id); },
  boneOf(id) { return !!levelValue(data.bones, id); },
  bestDogsOf(id) { return count(levelValue(data.bestDogs, id)); },
  setBeaten(id) { if (LEVEL_IDS.includes(String(id))) data.beaten[String(id)] = true; },
  setBone(id) {
    if (!LEVEL_IDS.includes(String(id))) return;
    data.bones[String(id)] = true;
    data.boneBoard[String(id)] = { ...board(data.boneBoard[String(id)]), golden: true };
  },
  setBestDogs(id, n) {
    if (LEVEL_IDS.includes(String(id))) data.bestDogs[String(id)] = Math.max(this.bestDogsOf(id), count(n));
  },
  hasProgress() { return data.seenIntro || data.unlocked > 1 || LEVEL_IDS.some((id) => this.beatenOf(id)); },
};
