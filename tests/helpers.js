import { save, START_LIVES } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';
import { resetLocks } from './locks.js';
import { resetSdk } from './sdkState.js';

export const HUB_STORAGE_KEY = 'nobu-hub-writes-v1';
export const SESSION_KEY = 'hub:nobu:session';

export function readHubStore() {
  const raw = localStorage.getItem(HUB_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function resetHub(h = hub) {
  h._sdk = null;
  h._initing = null;
  h.reach = 'offline';
  h.inSession = false;
  h.profile = null;
  h.verseCapLeft = null;
  h.sessionAllowance = null;
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
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: 't', playerId: 'player-1' }));
}

export async function readyHub(h = hub) {
  grantSession();
  resetHub(h);
  await h.init();
  return h;
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
