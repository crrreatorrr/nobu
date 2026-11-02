import { LEVEL_END_MAX_AMOUNT } from '../src/config/tickets.js';
import { save, START_LIVES } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';
import { resetLocks } from './locks.js';
import { resetSdk, sdk } from './sdkState.js';

export const HUB_STORAGE_KEY = 'nobu-hub-writes-v2';
export const HUB_STORAGE_KEY_V1 = 'nobu-hub-writes-v1';
export const SESSION_KEY = 'hub:nobu:session';

export function readHubStore() {
  const raw = localStorage.getItem(HUB_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function writeHubStore(store) {
  localStorage.setItem(HUB_STORAGE_KEY, JSON.stringify(store));
}

export function resetHub(h = hub) {
  h._sdk = null;
  h._initing = null;
  h.reach = 'offline';
  h.inSession = false;
  h.profile = null;
  h.verseCapLeft = null;
  h.sessionCapLeft = null;
  h.dailyCapLeft = null;
  h.rejectionRemaining = null;
  h.serverBalance = null;
  h.serverDay = null;
  h._flushing = false;
  h.status = '';
}

export function resetWorld() {
  localStorage.clear();
  sessionStorage.clear();
  resetSdk();
  resetLocks();
  save.reset();
  save.data.tickets = 0;
  save.data.lives = START_LIVES;
  save.data.godMode = false;
  save.data.trials = {};
  save.data.bonus = {};
  resetHub(hub);
}

export function grantSession() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    game: 'nobu',
    token: 't',
    playerId: 'player-1',
    sid: 'sid-1',
    ranked: true,
  }));
}

export async function readyHub(h = hub) {
  grantSession();
  resetHub(h);
  await h.init();
  return h;
}

/** level_end calls for `amount`, split the way the hub chunks an earn. */
export function levelEndCalls(baseKey, amount, limit = LEVEL_END_MAX_AMOUNT) {
  const total = Math.floor(Number(amount)) || 0;
  const calls = [];
  let offset = 0;
  while (offset < total) {
    const size = Math.min(limit, total - offset);
    const key = total <= limit ? baseKey : `${baseKey}:${calls.length}`;
    calls.push({ amount: size, reason: 'level_end', key });
    offset += size;
  }
  return calls;
}

export function creditedForBase(baseKey, ledger = sdk.earnLedger) {
  let total = 0;
  for (const [key, rec] of ledger) {
    if (key === baseKey || key.startsWith(`${baseKey}:`)) total += rec.amount;
  }
  return total;
}

export function captureBank(h = hub) {
  const pending = [];
  const orig = h.bank.bind(h);
  h.bank = (...args) => {
    const promise = orig(...args);
    pending.push(promise);
    return promise;
  };
  return {
    pending,
    restore() { h.bank = orig; },
  };
}
