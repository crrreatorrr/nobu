// Progress persistence in localStorage (every access wrapped; the game runs fine without it).
import { TRIAL_FLOOR_MS, TRIAL_LEVELS, LOCAL_TRIAL_LEVELS, trialMedal, trialLayout, trialVariant } from '../config/trials.js';
import { LEVEL_IDS, LEVEL_DOGS } from '../levels/metadata.js';
import { trialMastery, mergeTrialMastery } from '../game/mastery.js';
import { KENNEL_MILESTONES, kennelUnlocks } from '../game/progress.js';
import {withOriginLock} from './originLock.js';

const KEY = 'nobu-saviour-dog-save-v1';
// A save that does not parse is copied here before the game starts fresh, so it is never lost outright.
export const CORRUPT_KEY = `${KEY}.corrupt`;
export const SAVE_KEY = KEY;

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
    bonus: {},               // bonus stages: { ride: { beaten, best }, cave: {...} }
    // time trials: { 1: { best: seconds, ms, medal, at, deaths, freezeMs, pid } }
    // `ms` (integer) is the source of truth; `best` stays for the UI. `pid` is the hub player
    // that set it, or null when it was set standalone or in god mode (never uploaded).
    trials: {},
    colorBones: {},          // colored bones found: { red: true, blue: true }
    v: 3,
    musicVol: 0.6,
    sfxVol: 0.8,
  };
}

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v, dflt) => (Number.isFinite(v) ? v : dflt);
const count = (v) => (Number.isFinite(v) && v > 0 ? v : 0);

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
  out.pid = typeof e.pid === 'string' && e.pid ? e.pid : null;
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

function sanitizeBonus(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const [id, e] of Object.entries(raw)) {
    if (!isObj(e)) continue;
    const rec = { ...e };
    if ('best' in rec) rec.best = count(rec.best);
    out[id] = rec;
  }
  return out;
}

const OPEN_IDS = [...LEVEL_IDS, 'kennel', 'g1', 'g2', 'g3'];
const BOSS_KEYS = ['bird', 'cat', 'cone', 'titan', 'queen'];
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const DOG_ID = /^(1|2|3|4|5|6|ride|cave):[a-z]+-[a-z0-9]+$/;
const boolMap = (v, ids = LEVEL_IDS) => Object.fromEntries(ids.filter((id) => isObj(v) && v[id] === true).map((id) => [id, true]));
const countMap = (v) => Object.fromEntries(LEVEL_IDS.map((id) => [id, count(isObj(v) ? v[id] : 0)]).filter(([, n]) => n > 0));
const bestMs = (v, min = 1) => Number.isInteger(v) && v >= min ? v : null;
const minTime = (a, b) => a == null ? b : b == null ? a : Math.min(a, b);
const board = (v) => ({ golden: v?.golden === true, goodBoy: v?.goodBoy === true, hidden: v?.hidden === true,
  snack: Math.min(3, Math.max(0, Math.floor(finite(v?.snack, 0)))) });
const medal = (v) => ({ clear: v?.clear === true, noHit: v?.noHit === true, speed: v?.speed === true, bestMs: bestMs(v?.bestMs) });
const entriesFor = (raw, ids, clean) => Object.fromEntries(ids.filter((id) => isObj(raw) && isObj(raw[id])).map((id) => [id, clean(raw[id])]));

function sanitizeGauntlets(raw) {
  return entriesFor(raw, ['g1', 'g2', 'g3'], (v) => {
    // The rewards and box specs name these flags differently. Keep both spellings
    // in sync so either consumer preserves the same permanent mastery record.
    const found = v.found === true || v.polaroid === true;
    const flawless = v.flawless === true || v.noDeath === true;
    return { found, polaroid: found, clear: v.clear === true, allBoxes: v.allBoxes === true,
      flawless, noDeath: flawless, firstPaid: v.firstPaid === true, bestMs: bestMs(v.bestMs, 1000) };
  });
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
  d.dogsFreed = Object.fromEntries(Object.entries(isObj(d.dogsFreed) ? d.dogsFreed : {}).filter(([id, v]) => DOG_ID.test(id) && v === true));
  d.gauntlets = sanitizeGauntlets(d.gauntlets);
  d.lastMiss = sanitizeMiss(d.lastMiss);
  d.secretSeen = d.secretSeen === true;
  const kennel = isObj(d.kennel) ? d.kennel : {};
  d.kennel = { goldenSeen: kennel.goldenSeen === true, seen: Math.min(6, Math.max(0, Math.floor(finite(kennel.seen, 0)))),
    buddy: ['shiba', 'pug', 'dalmatian', 'corgi'].includes(kennel.buddy) ? kennel.buddy : null,
    tint: ['cream', 'shadow', 'ginger', 'chompGold'].includes(kennel.tint) ? kennel.tint : null };
  const knownDogs = Object.entries(LEVEL_DOGS).flatMap(([id, dogs]) => Object.keys(dogs).map((dog) => `${id}:${dog}`));
  const earned = kennelUnlocks(d, knownDogs.length, knownDogs.filter((id) => d.dogsFreed[id]).length);
  d.kennel.seenMilestones = isObj(kennel.seenMilestones)
    ? boolMap(kennel.seenMilestones, KENNEL_MILESTONES.map((m) => m.id))
    : Object.fromEntries(earned.slice(0, d.kennel.seen).map((id) => [id, true]));
  d.unlocked = Math.min(3, Math.max(1, Math.floor(finite(d.unlocked, 1))));
  d.lives = finite(d.lives, f.lives);
  d.tickets = finite(d.tickets, 0);
  d.musicVol = finite(d.musicVol, f.musicVol);
  d.sfxVol = finite(d.sfxVol, f.sfxVol);
  if (!isObj(d.tutorials)) d.tutorials = {};
  d.colorBones = boolMap(d.colorBones, COLORS);
  if (!isObj(d.loadout)) d.loadout = f.loadout;
  return d;
}

function mergeTrials(mine, disk) {
  const out = { ...mine };
  for (const [id, e] of Object.entries(disk)) out[id] = mergeTrialMastery(trialVariant(id, e.layout ?? 1), out[id], e);
  return out;
}

// Keep permanent progress from another tab, including writers still using v2.
// Tickets/lives and cosmetic choices stay local: they are not high scores.
function mergeScores(mine, raw) {
  Object.assign(mine, migrateTrialLayouts(mine.trials, mine.trialsClassic));
  const disk = sanitize({ ...fresh(), ...migrateSave(raw) });
  mine.trials = mergeTrials(mine.trials, disk.trials);
  mine.trialsClassic = mergeTrials(mine.trialsClassic, disk.trialsClassic);
  for (const k of ['beaten', 'bones', 'open', 'dogsFreed', 'perfect', 'chainBadges', 'colorBones']) {
    for (const [id, v] of Object.entries(disk[k])) if (v) mine[k][id] = true;
  }
  for (const k of ['bestDogs', 'bestChain']) {
    for (const [id, n] of Object.entries(disk[k])) mine[k][id] = Math.max(count(mine[k][id]), n);
  }
  for (const [id, e] of Object.entries(disk.boneBoard)) {
    const cur = board(mine.boneBoard[id]);
    mine.boneBoard[id] = { golden: cur.golden || e.golden, goodBoy: cur.goodBoy || e.goodBoy,
      hidden: cur.hidden || e.hidden, snack: Math.max(cur.snack, e.snack) };
  }
  for (const [id, e] of Object.entries(disk.bossMedals)) {
    const cur = medal(mine.bossMedals[id]);
    mine.bossMedals[id] = { clear: cur.clear || e.clear, noHit: cur.noHit || e.noHit,
      speed: cur.speed || e.speed, bestMs: minTime(cur.bestMs, e.bestMs) };
  }
  for (const [id, e] of Object.entries(disk.remix)) mine.remix[id] = { golden: !!mine.remix[id]?.golden || e.golden };
  mine.rush = { clear: mine.rush.clear || disk.rush.clear, noHit: mine.rush.noHit || disk.rush.noHit,
    bestMs: minTime(bestMs(mine.rush.bestMs), disk.rush.bestMs) };
  mine.kennel.seen = Math.max(mine.kennel.seen, disk.kennel.seen);
  mine.kennel.goldenSeen ||= disk.kennel.goldenSeen;
  mine.kennel.seenMilestones ||= {};
  Object.assign(mine.kennel.seenMilestones, disk.kennel.seenMilestones);
  const gauntlets = sanitizeGauntlets(mine.gauntlets);
  for (const [id, e] of Object.entries(disk.gauntlets)) {
    const cur = gauntlets[id] || {};
    gauntlets[id] = { ...e, ...cur, bestMs: minTime(bestMs(cur.bestMs, 1000), e.bestMs) };
    for (const k of ['found', 'polaroid', 'clear', 'allBoxes', 'flawless', 'noDeath', 'firstPaid']) gauntlets[id][k] = cur[k] === true || e[k];
  }
  mine.gauntlets = gauntlets;
  mine.secretSeen ||= disk.secretSeen;
  mine.seenCh2 ||= disk.seenCh2;
  mine.unlocked = Math.max(mine.unlocked, disk.unlocked);
  for (const [id, e] of Object.entries(disk.bonus)) {
    const cur = isObj(mine.bonus[id]) ? mine.bonus[id] : null;
    if (!cur) { mine.bonus[id] = e; continue; }
    const next = { ...cur };
    if ('best' in e || 'best' in cur) next.best = Math.max(count(cur.best), count(e.best));
    if (e.beaten) next.beaten = true;
    if (e.found) next.found = true;
    mine.bonus[id] = next;
  }
}

function readDisk() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isObj(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function levelValue(map, id) {
  const key = String(id);
  if (Array.isArray(map)) return /^[1-3]$/.test(key) ? map[Number(key) - 1] : undefined;
  return map?.[key];
}

let data = fresh();

export const save = {
  get data() { return data; },
  load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch { return data; }
    if (!raw) return data;
    try {
      const old = JSON.parse(raw);
      if (!isObj(old)) throw new Error('save is not an object');
      data = sanitize({ ...fresh(), ...migrateSave(old) });
    } catch (e) {
      try { localStorage.setItem(CORRUPT_KEY, raw); } catch { /* storage full or unavailable */ }
      console.warn('[save] unreadable save kept in', CORRUPT_KEY);
      data = fresh();
    }
    return data;
  },
  // Re-read the disk first so another tab's faster trial or bigger best is never overwritten.
  write({ merge = true } = {}) {
    try {
      if (merge) {
        const disk = readDisk();
        if (disk) mergeScores(data, disk);
      }
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* storage unavailable */ }
  },
  // Gauntlets have no run pickups: reconcile the latest durable wallet before
  // claiming the once-only reward, without replacing lives, checkpoints or run state.
  withGauntletEnd(mutator, { shouldCommit = () => true } = {}) {
    if (typeof mutator !== 'function' || mutator.constructor.name === 'AsyncFunction') throw new TypeError('Gauntlet transaction must be synchronous');
    return withOriginLock('nobu-gauntlet-end-v1', () => {
      if (!shouldCommit()) return { cancelled: true, tickets: 0, medals: [], claimDurable: false };
      const raw = readDisk();
      if (raw) {
        const latest = sanitize({ ...fresh(), ...migrateSave(raw) });
        mergeScores(data, latest);
        data.tickets = latest.tickets; // Current wallet read, before the canonical credit path.
      }
      const result = mutator(data);
      if (result && typeof result.then === 'function') throw new TypeError('Gauntlet transaction must be synchronous');
      this.write();
      const persisted = readDisk();
      const claimDurable = ['g1', 'g2', 'g3'].includes(result?.id) && persisted?.gauntlets?.[result.id]?.firstPaid === true;
      return { ...result, claimDurable };
    });
  },
  // New game clears story progress; trial and mastery records stay permanent.
  reset() {
    const keep = { nobuModel: data.nobuModel, pixelated: data.pixelated, godMode: data.godMode, musicVol: data.musicVol, sfxVol: data.sfxVol, loadout: data.loadout };
    const disk = readDisk();
    const records = sanitize({ ...fresh(), ...data });
    if (disk) mergeScores(records, disk);
    const mastery = Object.fromEntries(['trials', 'trialsClassic', 'bossMedals', 'perfect', 'rush', 'gauntlets'].map((k) => [k, records[k]]));
    data = { ...fresh(), ...keep, ...mastery };
    this.write({ merge: false });
  },
  /** Sum of the three trial bests in ms, or null until all three exist. */
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
