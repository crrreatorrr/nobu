// Hub bridge for NOBU. Wraps @metaverse/hub-sdk and a localStorage key store.
// Keys are written before any RPC. If the hub is unreachable, play continues
// and unacked writes stay queued for the next init.
import { createHubSdk, HubEvent, BoardId, HUB_OUTBOX_DB, TICKETS_PER_VERSE, VERSE_DAILY_CAP } from '@metaverse/hub-sdk';
import { save } from '../core/save.js';
import { CARRY_MAX, LEVEL_END_MAX_AMOUNT } from '../config/tickets.js';

const GAME_ID = 'nobu';
const EARN_REASON = 'level_end';
const STORAGE_KEY = 'nobu-hub-writes-v1';
const SESSION_KEY = 'hub:nobu:session';
const LOCK_NAME = 'nobu-hub-writes';
const OUTBOX_STORE = 'writes';

export { TICKETS_PER_VERSE };
export const MAX_EXCHANGE_TICKETS = VERSE_DAILY_CAP * TICKETS_PER_VERSE;

const HUB_URL = import.meta.env.VITE_HUB_URL || '/hub/';

/** Terminal earn/exchange codes are acked and dropped. `rpc_failed` and transport errors stay queued. */

export function maxExchangeTickets(balance) {
  const stepped = Math.floor(Math.max(0, Number(balance) || 0) / TICKETS_PER_VERSE) * TICKETS_PER_VERSE;
  return Math.min(MAX_EXCHANGE_TICKETS, stepped);
}

export function hubExitUrl() {
  const base = String(HUB_URL).replace(/\/+$/, '');
  return `${base}/#from=${GAME_ID}`;
}

function uuidv7() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const ms = BigInt(Date.now());
  bytes[0] = Number((ms >> 40n) & 0xffn);
  bytes[1] = Number((ms >> 32n) & 0xffn);
  bytes[2] = Number((ms >> 24n) & 0xffn);
  bytes[3] = Number((ms >> 16n) & 0xffn);
  bytes[4] = Number((ms >> 8n) & 0xffn);
  bytes[5] = Number(ms & 0xffn);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function emptyStore() {
  return { v: 1, attempts: {}, earns: {}, relics: {}, held: {}, carry: null, carryClearedKey: null, exchange: null, receipts: [] };
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asIdList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => typeof id === 'string' && id))];
}

function sanitize(parsed) {
  const store = emptyStore();
  if (!parsed || typeof parsed !== 'object') return store;
  for (const [id, rec] of Object.entries(asRecord(parsed.attempts))) {
    if (rec && (typeof rec.level === 'string' || typeof rec.level === 'number')) store.attempts[id] = { level: String(rec.level) };
  }
  for (const [id, rec] of Object.entries(asRecord(parsed.earns))) {
    if (!rec || !Number.isFinite(Number(rec.amount))) continue;
    const dropped = !!rec.dropped;
    store.earns[id] = { amount: Math.floor(Number(rec.amount)), acked: !!rec.acked || dropped, dropped, covers: asIdList(rec.covers) };
  }
  for (const [id, rec] of Object.entries(asRecord(parsed.held))) {
    if (!rec || !Number.isFinite(Number(rec.amount))) continue;
    store.held[id] = { amount: Math.floor(Number(rec.amount)), dropped: !!rec.dropped };
  }
  const carry = parsed.carry;
    if (carry && typeof carry === 'object' && typeof carry.key === 'string' && carry.key && Number.isFinite(Number(carry.amount)) && typeof carry.day === 'string') {
    store.carry = { key: carry.key, amount: Math.floor(Number(carry.amount)), day: carry.day };
  }
  store.carryClearedKey = typeof parsed.carryClearedKey === 'string' ? parsed.carryClearedKey : null;
  for (const [id, rec] of Object.entries(asRecord(parsed.relics))) {
    if (!rec || typeof rec.key !== 'string' || !rec.key) continue;
    store.relics[id] = { key: rec.key, acked: !!rec.acked, dropped: !!rec.dropped };
  }
  const ex = parsed.exchange;
  if (ex && typeof ex === 'object' && typeof ex.id === 'string' && ex.id && Number.isFinite(Number(ex.tickets))) {
    store.exchange = { id: ex.id, tickets: Math.floor(Number(ex.tickets)), acked: !!ex.acked, dropped: !!ex.dropped };
  }
  if (Array.isArray(parsed.receipts)) store.receipts = [...new Set(parsed.receipts.filter((id) => typeof id === 'string' && id))];
  return store;
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    return sanitize(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

function mergeEarns(disk = {}, ours = {}) {
  const out = {};
  for (const id of new Set([...Object.keys(disk), ...Object.keys(ours)])) {
    const left = disk[id];
    const right = ours[id];
    const covers = [...new Set([...(left?.covers || []), ...(right?.covers || [])])];
    if (left?.dropped && right && !right.dropped && Number.isFinite(right.amount)) {
      out[id] = { amount: right.amount, acked: !!right.acked, dropped: false, covers };
      continue;
    }
    const amount = left && Number.isFinite(left.amount) ? left.amount : right?.amount;
    if (!Number.isFinite(amount)) continue;
    const dropped = !!(left?.dropped || right?.dropped);
    out[id] = { amount, acked: dropped || !!(left?.acked || right?.acked), dropped, covers };
  }
  return out;
}

function mergeHeld(disk = {}, ours = {}) {
  const out = {};
  for (const id of new Set([...Object.keys(disk), ...Object.keys(ours)])) {
    const left = disk[id];
    const right = ours[id];
    const amount = left && Number.isFinite(left.amount) ? left.amount : right?.amount;
    if (!Number.isFinite(amount)) continue;
    out[id] = { amount, dropped: !!(left?.dropped || right?.dropped) };
  }
  return out;
}

function mergeRelics(disk = {}, ours = {}) {
  const out = {};
  for (const id of new Set([...Object.keys(disk), ...Object.keys(ours)])) {
    const left = disk[id];
    const right = ours[id];
    const key = left?.key || right?.key;
    if (!key) continue;
    const dropped = !!(left?.dropped || right?.dropped);
    out[id] = { key, acked: dropped || !!(left?.acked || right?.acked), dropped };
  }
  return out;
}

function mergeExchange(disk, ours) {
  if (disk?.dropped && (!ours || ours.id === disk.id)) return { ...disk, tickets: disk.tickets, dropped: true, acked: true };
  if (ours?.dropped && (!disk || disk.id === ours.id)) {
    const tickets = disk && disk.id === ours.id ? disk.tickets : ours.tickets;
    return { id: ours.id, tickets, dropped: true, acked: true };
  }
  if (disk && ours && disk.id === ours.id) {
    return { id: disk.id, tickets: disk.tickets, acked: !!(disk.acked || ours.acked), dropped: false };
  }
  if (disk && !disk.acked && !disk.dropped) return disk;
  if (ours && !ours.acked && !ours.dropped) return ours;
  return ours || disk || null;
}

function mergeCarry(disk, ours, diskClearedKey, oursClearedKey) {
  const live = (carry) => (carry && carry.key && carry.amount > 0 && carry.day === utcDay() ? carry : null);
  const left = live(disk);
  const right = live(ours);
  if (oursClearedKey && (!left || left.key === oursClearedKey)) return right && right.key !== oursClearedKey ? right : null;
  if (!left) return right;
  if (!right) return left;
  if (left.key === right.key) return { key: left.key, amount: Math.min(CARRY_MAX, Math.max(left.amount, right.amount)), day: left.day };
  if (diskClearedKey && left.key === diskClearedKey) return right;
  return left;
}

function utcDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function mergeStore(disk, ours) {
  const left = sanitize(disk);
  const right = sanitize(ours);
  return {
    v: 1,
    attempts: { ...left.attempts, ...right.attempts },
    earns: mergeEarns(left.earns, right.earns),
    held: mergeHeld(left.held, right.held),
    carry: mergeCarry(left.carry, right.carry, left.carryClearedKey, right.carryClearedKey),
    carryClearedKey: right.carryClearedKey || left.carryClearedKey || null,
    relics: mergeRelics(left.relics, right.relics),
    exchange: mergeExchange(left.exchange, right.exchange),
    receipts: [...new Set([...(left.receipts || []), ...(right.receipts || [])])],
  };
}

function writeMerged(produce) {
  const run = () => {
    try {
      const disk = readStore();
      const draft = produce(structuredClone(disk)) || disk;
      const latest = readStore();
      const finalStore = mergeStore(latest, draft);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalStore));
      return true;
    } catch (err) {
      console.warn('[hub] key store was not saved', err);
      return false;
    }
  };
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(LOCK_NAME, run);
  }
  return Promise.resolve(run());
}

function pendingExchange() {
  const ex = readStore().exchange;
  if (!ex || !ex.id || ex.acked || ex.dropped || !(ex.tickets > 0)) return null;
  return ex;
}

function hasSession() {
  try { return !!sessionStorage.getItem(SESSION_KEY); } catch { return false; }
}

function wholeNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

// One read for the hub ticket account. getTicketBalance() is the SDK hook (absent in 0.1.0).
// Caps come from sessionCapLeft and dailyCapLeft. A cap rejection contributes remainingCap only.
async function readTicketAccount(sdk, payload) {
  let hooked = null;
  if (sdk && typeof sdk.getTicketBalance === 'function') {
    try { hooked = await sdk.getTicketBalance(); } catch { hooked = null; }
  }
  const sources = [hooked, payload].filter((source) => source && typeof source === 'object');
  const pick = (key) => {
    for (const source of sources) {
      const n = wholeNumber(source[key]);
      if (n != null) return n;
    }
    return null;
  };
  let remainingCap = pick('remainingCap');
  const message = payload && typeof payload.message === 'string' ? payload.message : '';
  if (remainingCap == null && message) {
    try { remainingCap = wholeNumber(JSON.parse(message).remainingCap); } catch { /* not a JSON payload */ }
  }
  const sessionCapLeft = pick('sessionCapLeft');
  const dailyCapLeft = pick('dailyCapLeft');
  const balance = pick('balance');
  const caps = [sessionCapLeft, dailyCapLeft, remainingCap].filter((n) => n != null);
  return {
    balance,
    sessionCapLeft,
    dailyCapLeft,
    remainingCap,
    allowance: caps.length ? Math.min(...caps) : null,
    capsFromHook: !!(hooked && (wholeNumber(hooked.sessionCapLeft) != null || wholeNumber(hooked.dailyCapLeft) != null)),
  };
}

function errorInfo(err) {
  const code = err && typeof err.code === 'string' ? err.code : 'rejected';
  const message = err && err.message ? String(err.message) : String(err);
  return { code, message };
}

function isTerminal(code) {
  if (typeof code !== 'string' || code === 'rpc_failed' || code === 'rejected') return false;
  return code === 'idempotency_mismatch' || code === 'amount_over_rule' || code.endsWith('_cap');
}

async function openWrites(mode) {
  if (typeof indexedDB === 'undefined' || !indexedDB.databases) throw new Error('no idb');
  const dbs = await indexedDB.databases();
  if (!dbs.some((db) => db.name === HUB_OUTBOX_DB)) throw new Error('no outbox');
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HUB_OUTBOX_DB);
    req.onerror = () => reject(req.error || new Error('idb'));
    req.onupgradeneeded = () => {
      try { req.transaction.abort(); } catch { /* leave the SDK schema alone */ }
      reject(new Error('upgrade'));
    };
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.close();
        reject(new Error('no store'));
        return;
      }
      const tx = db.transaction(OUTBOX_STORE, mode);
      resolve({ db, store: tx.objectStore(OUTBOX_STORE), tx });
    };
  });
}

function txDone(tx, db) {
  return new Promise((resolve) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); resolve(); };
  });
}

async function firstOutboxKey() {
  try {
    const { db, store, tx } = await openWrites('readonly');
    const key = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = req.result || [];
        resolve(rows[0]?.key || null);
      };
      req.onerror = () => resolve(null);
    });
    await txDone(tx, db);
    return key;
  } catch {
    return null;
  }
}

async function forgetOutbox(key) {
  if (!key) return;
  try {
    const { db, store, tx } = await openWrites('readwrite');
    store.delete(key);
    await txDone(tx, db);
  } catch {
    /* the row stays queued and the next init tries again */
  }
}

function normalizeExchange(result, requested) {
  const receiptId = result && typeof result.receiptId === 'string' ? result.receiptId : '';
  let debited = null;
  let verseCredited = null;
  if (result && Number.isFinite(Number(result.ticketsDebited))) debited = Math.floor(Number(result.ticketsDebited));
  if (result && Number.isFinite(Number(result.verseCredited))) verseCredited = Number(result.verseCredited);
  if (debited == null && verseCredited != null) debited = Math.floor(verseCredited) * TICKETS_PER_VERSE;
  if (debited == null && receiptId && receiptId !== 'noop') debited = requested;
  let verseCapLeft = null;
  if (result && Object.prototype.hasOwnProperty.call(result, 'verseCapLeft') && result.verseCapLeft != null && result.verseCapLeft !== '') {
    const n = Number(result.verseCapLeft);
    if (Number.isFinite(n)) verseCapLeft = n;
  }
  return { receiptId, debited, verseCredited, verseCapLeft };
}

class HubBridge {
  constructor() {
    this.reach = 'offline';
    this.inSession = false;
    this.profile = null;
    this.verseCapLeft = null;
    this.sessionCapLeft = null;
    this.dailyCapLeft = null;
    this.rejectionRemaining = null;
    this.status = '';
    this._sdk = null;
    this._initing = null;
  }

  get sdk() {
    if (!this._sdk) this._sdk = createHubSdk({ serverUrl: '', hubUrl: HUB_URL });
    return this._sdk;
  }

  init() {
    if (!this._initing) {
      this.reach = 'pending';
      this._initing = this._doInit();
    }
    return this._initing;
  }

  async _doInit() {
    for (let i = 0; i < 16; i++) {
      try {
        this.profile = await this.sdk.init(GAME_ID);
        this.reach = 'ready';
        this.inSession = hasSession();
        break;
      } catch (err) {
        const info = errorInfo(err);
        if (isTerminal(info.code)) {
          const key = await firstOutboxKey();
          console.warn('[hub] terminal error, dropping write', info.code, key || '', info.message);
          if (!key) { this.reach = 'offline'; break; }
          await this._dropKey(key);
          await forgetOutbox(key);
          continue;
        }
        console.warn('[hub] unreachable, play continues', info.code, info.message);
        this.reach = 'offline';
        this.inSession = hasSession();
        break;
      }
    }
    if (this.reach !== 'ready') {
      this.reach = 'offline';
      this.inSession = hasSession();
    }
    if (this.inSession) await this._syncTicketAccount();
    if (this.reach === 'ready' && this.inSession) await this.flush();
  }

  async _syncTicketAccount(payload) {
    const account = await readTicketAccount(this._sdk, payload);
    if (account.capsFromHook) this.rejectionRemaining = null;
    if (account.sessionCapLeft != null) this.sessionCapLeft = account.sessionCapLeft;
    if (account.dailyCapLeft != null) this.dailyCapLeft = account.dailyCapLeft;
    if (account.remainingCap != null) this.rejectionRemaining = account.remainingCap;
    if (this.inSession && account.balance != null) {
      save.data.tickets = account.balance;
      save.write();
    }
    return account;
  }

  view() {
    const pending = pendingExchange();
    return {
      pending,
      status: pending ? 'Exchange pending' : this.status,
      verseCapLeft: this.verseCapLeft,
      reach: this.reach,
      inSession: this.inSession,
    };
  }

  async beginAttempt(level) {
    const id = uuidv7();
    const levelId = String(level);
    const wrote = await writeMerged((s) => {
      s.attempts[id] = { level: levelId };
      return s;
    });
    const saved = wrote && readStore().attempts[id]?.level === levelId;
    if (!saved) console.warn('[hub] level attempt id was not saved; earnTickets will not be sent');
    return { id, ok: !!saved };
  }

  // Quit, game over, and secret warp do not call this. A finished time trial does.
  async bank(attemptId, amount, durable) {
    const earned = Math.floor(Number(amount)) || 0;
    if (!attemptId || earned <= 0) return;
    if (!durable || !readStore().attempts[attemptId]) {
      console.warn('[hub] earn not sent; attempt id was not saved');
      return;
    }
    const { accepted } = await this._bankAmount(attemptId, earned);
    await this._addCarry(earned - accepted);
  }

  // Carry from an earlier clear banks before this attempt's own tickets.
  async bankCarry() {
    await this._expireCarry();
    const carry = readStore().carry;
    if (!carry || !(carry.amount > 0)) return;
    const { accepted, code } = await this._bankAmount(carry.key, carry.amount);
    if (accepted <= 0 && code && code !== 'session_ticket_cap' && isTerminal(code)) {
      console.warn('[hub] carry dropped', code, carry.key);
      await this._clearCarry(carry.key);
      return;
    }
    if (accepted <= 0) return;
    const rest = carry.amount - accepted;
    if (rest <= 0) await this._clearCarry(carry.key);
    else await this._replaceCarry(rest, carry.day);
  }

  async reportCone(attemptId, durable) {
    if (!durable || !attemptId || !readStore().attempts[attemptId]) {
      console.warn('[hub] relic not sent; attempt id was not saved');
      return;
    }
    const rec = await this._commitRelic(attemptId);
    if (!rec) {
      console.warn('[hub] relic not sent; key was not saved');
      return;
    }
    if (rec.acked || rec.dropped) return;
    await this.init();
    if (this.reach !== 'ready' || !this.inSession) return;
    await this._sendRelic(attemptId);
  }

  submitScore(seconds, level) {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    this.sdk.submitScore(BoardId.NobuTrialTime, seconds, { level }).catch((err) => {
      const info = errorInfo(err);
      console.warn('[hub] score not submitted', info.code, info.message);
    });
  }

  async exchange(tickets) {
    const existing = pendingExchange();
    if (existing) {
      this.status = 'Exchange pending';
      await this.init();
      await this._sendExchange(existing);
      return this.view();
    }
    if (this.reach === 'pending') await this.init();
    if (this.reach !== 'ready' || !this.inSession) {
      this.status = this.reach === 'pending'
        ? 'Connecting to the hub…'
        : 'Open this game from the hub to exchange.';
      return this.view();
    }
    const whole = Math.floor(Number(tickets));
    if (!(whole > 0)) return this.view();
    const slot = { id: uuidv7(), tickets: whole, acked: false, dropped: false };
    const wrote = await writeMerged((s) => {
      const cur = s.exchange;
      if (cur && cur.id && !cur.acked && !cur.dropped) return s;
      s.exchange = slot;
      return s;
    });
    const disk = readStore().exchange;
    if (!wrote || !disk || disk.id !== slot.id || disk.tickets !== whole || disk.acked || disk.dropped) {
      if (disk && !disk.acked && !disk.dropped) {
        this.status = 'Exchange pending';
        await this._sendExchange(disk);
      } else {
        console.warn('[hub] exchange not sent; the key was not saved');
      }
      return this.view();
    }
    await this._sendExchange(disk);
    return this.view();
  }

  resendExchange() {
    const slot = pendingExchange();
    if (!slot) return Promise.resolve(this.view());
    this.status = 'Exchange pending';
    return this.init().then(() => this._sendExchange(slot)).then(() => this.view());
  }

  exit(reason = 'exit_to_hub') {
    try { this.sdk.exit(reason); } catch (err) {
      console.warn('[hub] exit failed', errorInfo(err).message);
    }
    const target = hubExitUrl();
    try {
      const abs = new URL(target, window.location.href);
      if (window.location.href !== abs.href) window.location.assign(abs.href);
    } catch {
      window.location.assign(target);
    }
  }

  async flush() {
    this._flushing = true;
    try {
      await this.bankCarry();
    } finally {
      this._flushing = false;
    }
    const store = readStore();
    for (const [id, rec] of Object.entries(store.earns)) {
      if (!rec.acked && !rec.dropped && rec.amount > 0) {
        const sent = await this._sendEarn(id);
        const accepted = sent.ok || sent.queued ? (sent.accepted ?? rec.amount) : 0;
        if (accepted < rec.amount) await this._addCarry(rec.amount - accepted);
      }
    }
    for (const [id, rec] of Object.entries(store.relics)) {
      if (!rec.acked && !rec.dropped && rec.key) await this._sendRelic(id);
    }
    const ex = pendingExchange();
    if (ex) await this._sendExchange(ex);
  }

  _knownAllowance() {
    const caps = [this.sessionCapLeft, this.dailyCapLeft, this.rejectionRemaining].filter((n) => n != null);
    if (!caps.length) return null;
    return Math.min(...caps);
  }

  _spendAllowance(amount) {
    const n = Math.floor(Number(amount));
    if (!(n > 0)) return;
    if (this.sessionCapLeft != null) this.sessionCapLeft = Math.max(0, this.sessionCapLeft - n);
    if (this.dailyCapLeft != null) this.dailyCapLeft = Math.max(0, this.dailyCapLeft - n);
    if (this.rejectionRemaining != null) this.rejectionRemaining = Math.max(0, this.rejectionRemaining - n);
  }

  async _bankAmount(key, earned) {
    const allowance = this._knownAllowance();
    if (allowance === 0) return { accepted: 0, code: 'session_ticket_cap' };
    const planned = Math.min(earned, allowance ?? earned, LEVEL_END_MAX_AMOUNT);
    if (!(planned > 0)) return { accepted: 0 };
    const committed = await this._commitEarn(key, planned);
    if (!committed) return { accepted: 0, code: 'persist' };
    if (committed.acked && !committed.dropped) return { accepted: committed.amount };
    if (!this._flushing) await this.init();
    if (this.reach !== 'ready' || !this.inSession) return { accepted: committed.amount, queued: true };
    const sent = await this._sendEarn(key);
    if (sent.ok || sent.queued) return { accepted: sent.accepted ?? committed.amount, queued: !!sent.queued, code: sent.code };
    return { accepted: 0, code: sent.code };
  }

  async _addCarry(amount) {
    const add = Math.floor(Number(amount));
    if (!(add > 0)) return;
    let discarded = 0;
    await writeMerged((s) => {
      const today = utcDay();
      const cur = s.carry && s.carry.day === today ? s.carry : null;
      const earn = cur ? s.earns[cur.key] : null;
      const inFlight = earn && !earn.acked && !earn.dropped;
      if (inFlight) {
        discarded = add;
        return s;
      }
      const settled = earn && (earn.acked || earn.dropped);
      const base = cur && !settled ? cur.amount : 0;
      const key = cur && !settled ? cur.key : uuidv7();
      const accepted = Math.min(Math.max(0, CARRY_MAX - base), add);
      discarded = add - accepted;
      if (!(accepted > 0)) return s;
      s.carry = { key, amount: base + accepted, day: today };
      return s;
    });
    if (discarded > 0) console.warn('[hub] discarded tickets above carry cap', discarded);
  }

  async _expireCarry() {
    await writeMerged((s) => {
      if (s.carry && s.carry.day !== utcDay()) s.carry = null;
      return s;
    });
  }

  async _clearCarry(key) {
    await writeMerged((s) => {
      if (!s.carry || !key || s.carry.key === key) {
        s.carry = null;
        s.carryClearedKey = key || s.carryClearedKey;
      }
      return s;
    });
  }

  async _replaceCarry(amount, day) {
    const next = Math.min(CARRY_MAX, Math.floor(amount));
    if (!(next > 0)) return;
    await writeMerged((s) => {
      s.carryClearedKey = s.carry?.key || s.carryClearedKey;
      s.carry = { key: uuidv7(), amount: next, day };
      return s;
    });
  }

  async _commitEarn(id, amount) {
    const wrote = await writeMerged((s) => {
      const existing = s.earns[id];
      if (existing && Number.isFinite(existing.amount) && !existing.dropped) return s;
      s.earns[id] = { amount, acked: false, dropped: false, covers: existing?.covers || [] };
      return s;
    });
    if (!wrote) return null;
    const rec = readStore().earns[id];
    if (!rec || !Number.isFinite(rec.amount)) return null;
    return rec;
  }

  async _commitRelic(attemptId) {
    const wrote = await writeMerged((s) => {
      const existing = s.relics[attemptId];
      if (existing?.key) return s;
      s.relics[attemptId] = { key: uuidv7(), acked: false, dropped: false };
      return s;
    });
    if (!wrote) return null;
    const rec = readStore().relics[attemptId];
    if (!rec?.key) return null;
    return rec;
  }

  async _sendEarn(id, shrink = true) {
    const rec = readStore().earns[id];
    if (!rec || !(rec.amount > 0)) return { ok: false, accepted: 0 };
    if (rec.acked && !rec.dropped) return { ok: true, accepted: rec.amount };
    if (rec.dropped || this.reach !== 'ready' || !this.inSession) return { queued: !rec.dropped, accepted: rec.dropped ? 0 : rec.amount };
    try {
      const result = await this.sdk.earnTickets(rec.amount, EARN_REASON, id);
      // Standalone no-op is { balance: 0, capped: false } and must stay queued.
      if (!result || typeof result.balance !== 'number' || (result.balance === 0 && result.capped === false) || !hasSession()) {
        return { queued: true, accepted: rec.amount };
      }
      await writeMerged((s) => {
        const cur = s.earns[id];
        if (!cur || cur.dropped || cur.amount !== rec.amount) return s;
        cur.acked = true;
        return s;
      });
      const account = await this._syncTicketAccount(result);
      if (!account.capsFromHook) this._spendAllowance(rec.amount);
      return { ok: true, accepted: rec.amount };
    } catch (err) {
      const info = errorInfo(err);
      if (typeof info.code === 'string' && info.code.endsWith('_cap')) {
        const account = await readTicketAccount(null, err);
        const allowance = account.remainingCap == null ? 0 : account.remainingCap;
        if (info.code === 'session_ticket_cap') this.sessionCapLeft = allowance;
        else this.dailyCapLeft = allowance;
        this.rejectionRemaining = allowance;
        await this._failWrite(err, id);
        if (!shrink || !(allowance > 0) || allowance >= rec.amount) return { ok: false, accepted: 0, code: info.code };
        const replaced = await this._commitEarn(id, allowance);
        if (!replaced || replaced.amount !== allowance) return { ok: false, accepted: 0, code: info.code };
        const second = await this._sendEarn(id, false);
        if (second.ok || second.queued) return { ...second, accepted: allowance, code: info.code };
        return { ok: false, accepted: 0, code: second.code || info.code };
      }
      if (isTerminal(info.code)) {
        await this._failWrite(err, id);
        return { ok: false, accepted: 0, code: info.code };
      }
      console.warn('[hub] write not acked', info.code, id, info.message);
      return { queued: true, accepted: rec.amount, code: info.code };
    }
  }

  async _sendRelic(attemptId) {
    const rec = readStore().relics[attemptId];
    if (!rec || rec.acked || rec.dropped || !rec.key) return;
    if (this.reach !== 'ready' || !this.inSession) return;
    try {
      await this.sdk.reportEvent(HubEvent.NobuBossDefeated, { boss: 'cone' }, rec.key);
      if (!hasSession()) return;
      await writeMerged((s) => {
        const cur = s.relics[attemptId];
        if (!cur || cur.dropped || cur.key !== rec.key) return s;
        cur.acked = true;
        return s;
      });
    } catch (err) {
      await this._failWrite(err, rec.key);
    }
  }

  async _sendExchange(slot) {
    const current = readStore().exchange;
    if (!current || current.id !== slot.id || current.acked || current.dropped) return;
    if (this.reach !== 'ready' || !this.inSession) return;
    try {
      const result = await this.sdk.exchange(current.tickets, current.id);
      this._noteVerseCap(result);
      const norm = normalizeExchange(result, current.tickets);
      if (!norm.receiptId || norm.receiptId === 'noop') return;
      if (!hasSession()) return;
      await this._applyReceipt(current.id, norm);
      await this._syncTicketAccount(result);
    } catch (err) {
      const dropped = await this._failWrite(err, current.id);
      if (dropped && pendingExchange()?.id !== current.id) {
        const info = errorInfo(err);
        this.status = info.code.endsWith('_cap') ? 'Daily Verse cap reached.' : 'Exchange failed.';
      }
    }
  }

  async _applyReceipt(slotId, norm) {
    let first = false;
    const wrote = await writeMerged((s) => {
      if (!s.receipts.includes(norm.receiptId)) {
        s.receipts.push(norm.receiptId);
        first = true;
      }
      if (s.exchange && s.exchange.id === slotId && !s.exchange.dropped) s.exchange.acked = true;
      return s;
    });
    if (!wrote) return;
    if (first) {
      const debited = Math.max(0, Math.floor(Number(norm.debited) || 0));
      save.data.tickets = Math.max(0, save.data.tickets - debited);
      save.write();
    }
    this.status = Number.isFinite(norm.verseCredited) ? `Verse +${norm.verseCredited}` : 'Exchanged';
  }

  _noteVerseCap(result) {
    const norm = normalizeExchange(result, 0);
    if (norm.verseCapLeft != null) this.verseCapLeft = norm.verseCapLeft;
  }

  async _failWrite(err, key) {
    const info = errorInfo(err);
    if (!isTerminal(info.code)) {
      console.warn('[hub] write not acked', info.code, key, info.message);
      return false;
    }
    console.warn('[hub] acking and dropping write', info.code, key, info.message);
    await this._dropKey(key);
    await forgetOutbox(key);
    return true;
  }

  _dropKey(key) {
    return writeMerged((s) => {
      if (s.earns[key]) s.earns[key] = { ...s.earns[key], dropped: true, acked: true };
      for (const rec of Object.values(s.relics)) {
        if (rec && rec.key === key) { rec.dropped = true; rec.acked = true; }
      }
      if (s.exchange && s.exchange.id === key) s.exchange = { ...s.exchange, dropped: true, acked: true };
      return s;
    });
  }
}

export const hub = new HubBridge();
