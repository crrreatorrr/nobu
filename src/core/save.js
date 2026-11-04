// Progress persistence in localStorage (every access wrapped; the game runs fine without it).
import { TRIAL_FLOOR_MS, TRIAL_LEVELS, trialMedal } from '../config/trials.js';

const KEY = 'nobu-saviour-dog-save-v1';
// A save that does not parse is copied here before the game starts fresh, so it is never lost outright.
export const CORRUPT_KEY = `${KEY}.corrupt`;
export const SAVE_KEY = KEY;

export const START_LIVES = 4;

function fresh() {
  return {
    unlocked: 1,             // highest level the player may enter (1..3)
    beaten: [false, false, false],
    bones: [false, false, false],   // Golden Bone rewards (all breakables + all dogs)
    bestDogs: [0, 0, 0],
    lives: START_LIVES,
    tickets: 0,
    seenIntro: false,
    finished: false,
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
    v: 2,
    musicVol: 0.6,
    sfxVol: 0.8,
  };
}

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v, dflt) => (Number.isFinite(v) ? v : dflt);
const count = (v) => (Number.isFinite(v) && v > 0 ? v : 0);

function sanitizeTrial(level, e) {
  if (!isObj(e)) return null;
  const ms = Number.isInteger(e.ms) ? e.ms : Number.isFinite(e.best) ? Math.round(e.best * 1000) : NaN;
  // Below the hub floor is not a time anyone can play, so it is a bad value, not a record.
  if (!(ms >= TRIAL_FLOOR_MS[level])) return null;
  const best = Number.isFinite(e.best) && Math.round(e.best * 1000) === ms ? e.best : ms / 1000;
  const out = { best, ms, medal: trialMedal(level, best) };
  if (Number.isFinite(e.at)) out.at = e.at;
  if (Number.isInteger(e.deaths) && e.deaths >= 0) out.deaths = e.deaths;
  if (Number.isFinite(e.freezeMs) && e.freezeMs >= 0) out.freezeMs = Math.round(e.freezeMs);
  out.pid = typeof e.pid === 'string' && e.pid ? e.pid : null;
  return out;
}

export function sanitizeTrials(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const level of TRIAL_LEVELS) {
    const e = sanitizeTrial(level, raw[level]);
    if (e) out[level] = e;
  }
  return out;
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

const bools3 = (v) => [0, 1, 2].map((i) => !!(Array.isArray(v) && v[i]));

function sanitize(d) {
  const f = fresh();
  d.trials = sanitizeTrials(d.trials);
  d.bestDogs = [0, 1, 2].map((i) => count(Array.isArray(d.bestDogs) ? d.bestDogs[i] : 0));
  d.bonus = sanitizeBonus(d.bonus);
  d.beaten = bools3(d.beaten);
  d.bones = bools3(d.bones);
  d.unlocked = Math.min(3, Math.max(1, Math.floor(finite(d.unlocked, 1))));
  d.lives = finite(d.lives, f.lives);
  d.tickets = finite(d.tickets, 0);
  d.musicVol = finite(d.musicVol, f.musicVol);
  d.sfxVol = finite(d.sfxVol, f.sfxVol);
  if (!isObj(d.tutorials)) d.tutorials = {};
  if (!isObj(d.colorBones)) d.colorBones = {};
  if (!isObj(d.loadout)) d.loadout = f.loadout;
  return d;
}

// Scores from another tab: keep the faster trial (lower ms) and the larger dog / ticket bests.
function mergeScores(mine, disk) {
  const trials = { ...mine.trials };
  for (const [level, e] of Object.entries(sanitizeTrials(disk.trials))) {
    if (!trials[level] || e.ms < trials[level].ms) trials[level] = e;
  }
  mine.trials = trials;
  const dogs = Array.isArray(disk.bestDogs) ? disk.bestDogs : [];
  mine.bestDogs = mine.bestDogs.map((v, i) => Math.max(count(v), count(dogs[i])));
  const bonus = sanitizeBonus(disk.bonus);
  for (const [id, e] of Object.entries(bonus)) {
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
      data = sanitize({ ...fresh(), ...old });
      if (!(old.v >= 2)) { data.pixelated = false; data.v = 2; } // crisp rendering by default now
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
  // New game. Trial bests are kept: they are public on the hub board and permanent.
  reset() {
    const keep = { nobuModel: data.nobuModel, pixelated: data.pixelated, godMode: data.godMode, musicVol: data.musicVol, sfxVol: data.sfxVol, loadout: data.loadout };
    const disk = readDisk();
    const trials = sanitizeTrials(data.trials);
    if (disk) {
      for (const [level, e] of Object.entries(sanitizeTrials(disk.trials))) {
        if (!trials[level] || e.ms < trials[level].ms) trials[level] = e;
      }
    }
    data = { ...fresh(), ...keep, trials };
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
  hasProgress() { return data.seenIntro || data.unlocked > 1 || data.beaten.some(Boolean); },
};
