// Offline queue for hub trial scores, kept apart from the Ticket write store.
// One row per (player, variant) holding that player's fastest unsent time. A row stays
// until the hub answers for it, so a send lost to a bad connection is sent again.
//
// localStorage `nobu-hub-scores-v1`:
//   { v: 2,
//     rows:   { [playerId]: { ["nobu_trial_time:" + variant]: { ms, meta, at, tries } } },
//     posted: { [playerId]: { [variant]: ms } } }   // best the hub is known to hold
//
// Scores set with no hub session are never queued, so they stay local and are never
// attributed to a player later.
import { TRIAL_BOARD, trialMsInBounds, trialLayout, trialVariantInfo, canUploadTrial } from '../config/trials.js';

export const SCORE_QUEUE_KEY = 'nobu-hub-scores-v1';

/** Answers that end a row without saying the hub holds the time. */
const DROP_REASONS = new Set(['god_mode', 'server_board', 'unranked']);
const DROP_CODES = new Set(['bad_board', 'bad_score', 'bad_variant', 'implausible_score']);

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const rowKey = (level) => `${TRIAL_BOARD}:${level}`;

function empty() { return { v: 2, rows: {}, posted: {} }; }

export function readQueue() {
  try {
    const raw = localStorage.getItem(SCORE_QUEUE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    if (!isObj(parsed)) return empty();
    const q = { v: 2, rows: isObj(parsed.rows) ? parsed.rows : {}, posted: isObj(parsed.posted) ? parsed.posted : {} };
    let changed = parsed.v !== 2;
    for (const [pid, rows] of Object.entries(q.rows)) {
      if (!isObj(rows)) continue;
      for (const key of Object.keys(rows)) {
        if (!key.startsWith(`${TRIAL_BOARD}:`)) continue;
        const info = trialVariantInfo(key.slice(TRIAL_BOARD.length + 1));
        // Only the level whose geometry changed is upgraded. Even a v2 queue
        // must run this check when a later extension changes another level.
        if (info?.layout === 1 && trialLayout(info.level) > 1) { delete rows[key]; changed = true; }
      }
      if (!Object.keys(rows).length) delete q.rows[pid];
    }
    if (changed) writeQueue(q);
    return q;
  } catch {
    return empty();
  }
}

function writeQueue(q) {
  try { localStorage.setItem(SCORE_QUEUE_KEY, JSON.stringify(q)); } catch { /* storage unavailable */ }
}

// Re-read before every change so two tabs do not overwrite each other's rows.
function update(fn) {
  const q = readQueue();
  const out = fn(q);
  writeQueue(q);
  return out;
}

function postedMs(q, playerId, level) {
  const v = q.posted[playerId]?.[level];
  return Number.isInteger(v) ? v : null;
}

/** Fastest time for (player, level) that is queued or known to be on the hub, or null. */
export function knownBest(playerId, level) {
  const q = readQueue();
  const row = q.rows[playerId]?.[rowKey(level)];
  const vals = [postedMs(q, playerId, level), Number.isInteger(row?.ms) ? row.ms : null].filter((v) => v != null);
  return vals.length ? Math.min(...vals) : null;
}

/**
 * Queue `ms` for (player, level) unless it is out of bounds or not faster than what is
 * already queued or posted. Returns true when the row changed.
 */
export function enqueue(playerId, level, ms, meta = {}) {
  if (typeof playerId !== 'string' || !playerId) return false;
  const variant = String(level), info = trialVariantInfo(variant);
  if (!info || !canUploadTrial(variant) || !trialMsInBounds(variant, ms)) return false;
  const lv = variant;
  return update((q) => {
    const posted = postedMs(q, playerId, lv);
    if (posted != null && ms >= posted) return false;
    const rows = isObj(q.rows[playerId]) ? q.rows[playerId] : {};
    const cur = rows[rowKey(lv)];
    if (cur && Number.isInteger(cur.ms) && cur.ms <= ms) return false;
    rows[rowKey(lv)] = { ms, meta: { ...meta, level: info.layout === 1 ? info.level : variant, ...(info.layout > 1 ? { layout: info.layout } : {}) }, at: Date.now(), tries: 0 };
    q.rows[playerId] = rows;
    return true;
  });
}

/** Queued rows for one player, as [{ level, ms, meta, at, tries }]. */
export function pendingRows(playerId) {
  const rows = readQueue().rows[playerId];
  if (!isObj(rows)) return [];
  const out = [];
  for (const [key, row] of Object.entries(rows)) {
    const variant = key.slice(TRIAL_BOARD.length + 1), info = trialVariantInfo(variant);
    if (!key.startsWith(`${TRIAL_BOARD}:`) || !info || !isObj(row) || !trialMsInBounds(variant, row.ms)) continue;
    const level = info.level;
    out.push({ variant, level, ms: row.ms, meta: { ...(isObj(row.meta) ? row.meta : {}), level: info.layout === 1 ? level : variant }, at: row.at, tries: row.tries | 0 });
  }
  return out.sort((a, b) => a.variant.localeCompare(b.variant));
}

/**
 * What to do with a row after a send.
 * 'ack'  : the hub holds this time or better. Drop the row and remember it as posted.
 * 'drop' : a final answer that will never change on a resend. Drop the row.
 * 'keep' : unknown (an old SDK that returns nothing, a closed session, rate limit, transport). Retry later.
 */
export function classify(result, err, variant = '') {
  if (/v\d+$/.test(variant) && (err?.code === 'bad_variant' || result?.reason === 'bad_variant')) return 'keep';
  if (err) {
    const code = err && typeof err.code === 'string' ? err.code : '';
    return DROP_CODES.has(code) ? 'drop' : 'keep';
  }
  if (!isObj(result)) return 'keep';
  if (result.accepted === true) return 'ack';
  if (DROP_REASONS.has(result.reason)) return 'drop';
  return result.accepted === false ? 'drop' : 'keep';
}

function settle(playerId, row, verdict, result) {
  update((q) => {
    const rows = q.rows[playerId];
    const cur = rows?.[rowKey(row.variant)];
    // Only clear the row that was sent; a faster time queued meanwhile stays.
    const same = cur && cur.ms === row.ms;
    if (verdict === 'keep') {
      if (same) cur.tries = (cur.tries | 0) + 1;
      return;
    }
    if (same) {
      delete rows[rowKey(row.variant)];
      if (!Object.keys(rows).length) delete q.rows[playerId];
    }
    if (verdict === 'ack') {
      const held = Number.isInteger(result?.value) ? Math.min(result.value, row.ms) : row.ms;
      const prev = postedMs(q, playerId, row.variant);
      q.posted[playerId] = { ...(q.posted[playerId] || {}), [row.variant]: prev == null ? held : Math.min(prev, held) };
    }
  });
}

/**
 * Send every queued row of `playerId` through `sdk.submitScore`.
 * Returns { sent, acked, dropped, kept }. `kept > 0` means a retry is due.
 */
export async function flushQueue(sdk, playerId) {
  const out = { sent: 0, acked: 0, dropped: 0, kept: 0 };
  if (!sdk || typeof sdk.submitScore !== 'function' || !playerId) return out;
  for (const row of pendingRows(playerId)) {
    if (!canUploadTrial(row.variant)) continue;
    let result, err = null;
    try {
      result = await sdk.submitScore(TRIAL_BOARD, row.ms, row.meta);
    } catch (e) {
      err = e || new Error('submit failed');
    }
    out.sent += 1;
    const verdict = classify(result, err, row.variant);
    if (err && verdict === 'keep') console.warn('[hub] score kept for retry', err.code || '', err.message || '');
    if (verdict === 'drop') console.warn('[hub] score dropped', err?.code || result?.reason || '', row.level, row.ms);
    settle(playerId, row, verdict, result);
    out[verdict === 'ack' ? 'acked' : verdict === 'drop' ? 'dropped' : 'kept'] += 1;
  }
  return out;
}

/** Retry delays while the page stays open: 2 s, 10 s, 60 s, then every 5 min. */
export const RETRY_DELAYS_MS = Object.freeze([2000, 10000, 60000, 300000]);
export function retryDelay(failures) {
  return RETRY_DELAYS_MS[Math.min(Math.max(0, failures - 1), RETRY_DELAYS_MS.length - 1)];
}
