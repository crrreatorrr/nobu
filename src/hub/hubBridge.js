// Hub bridge for NOBU. Wraps @metaverse/hub-sdk and a localStorage key store.
// Keys are written before any RPC. If the hub is unreachable, play continues
// and unacked writes stay queued for the next init.
import { createHubSdk, HubEvent, BoardId, HUB_OUTBOX_DB, TICKETS_PER_VERSE, VERSE_DAILY_CAP } from '@metaverse/hub-sdk';
import { save } from '../core/save.js';

const GAME_ID = 'nobu';
const EARN_REASON = 'level_end';
const STORAGE_KEY = 'nobu-hub-writes-v1';
const SESSION_KEY = 'hub:nobu:session';
const LOCK_NAME = 'nobu-hub-writes';
const OUTBOX_STORE = 'writes';

export { TICKETS_PER_VERSE };
export const MAX_EXCHANGE_TICKETS = VERSE_DAILY_CAP * TICKETS_PER_VERSE;

const HUB_URL = import.meta.env.VITE_HUB_URL || '/hub/';

/** Daily cap is `cap` on the server and `verse_cap` in the SDK. Both stop a retry loop. */
const TERMINAL_CODES = new Set(['cap', 'verse_cap', 'idempotency_mismatch']);

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
  return { v: 1, attempts: {}, earns: {}, relics: {}, exchange: null, receipts: [] };
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function sanitize(parsed) {
  const store = emptyStore();
  if (!parsed || typeof parsed !== 'object') return store;
  for (const [id, rec] of Object.entries(asRecord(parsed.attempts))) {
    if (rec && (typeof rec.level === 'string' || typeof rec.level === 'number')) store.attempts[id] = { level: String(rec.level) };
  }
  for (const [id, rec] of Object.entries(asRecord(parsed.earns))) {
    if (!rec || !Number.isFinite(Number(rec.amount))) continue;
    store.earns[id] = { amount: Math.floor(Number(rec.amount)), acked: !!rec.acked, dropped: !!rec.dropped };
  }
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
    const amount = left && Number.isFinite(left.amount) ? left.amount : right?.amount;
    if (!Number.isFinite(amount)) continue;
    const dropped = !!(left?.dropped || right?.dropped);
    out[id] = { amount, acked: !dropped && !!(left?.acked || right?.acked), dropped };
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
    out[id] = { key, acked: !dropped && !!(left?.acked || right?.acked), dropped };
  }
  return out;
}

function mergeExchange(disk, ours) {
  if (disk?.dropped && (!ours || ours.id === disk.id)) return { ...disk, tickets: disk.tickets, dropped: true, acked: false };
  if (ours?.dropped && (!disk || disk.id === ours.id)) {
    const tickets = disk && disk.id === ours.id ? disk.tickets : ours.tickets;
    return { id: ours.id, tickets, dropped: true, acked: false };
  }
  if (disk && ours && disk.id === ours.id) {
    return { id: disk.id, tickets: disk.tickets, acked: !!(disk.acked || ours.acked), dropped: false };
  }
  if (disk && !disk.acked && !disk.dropped) return disk;
  if (ours && !ours.acked && !ours.dropped) return ours;
  return ours || disk || null;
}

function mergeStore(disk, ours) {
  const left = sanitize(disk);
  const right = sanitize(ours);
  return {
    v: 1,
    attempts: { ...left.attempts, ...right.attempts },
    earns: mergeEarns(left.earns, right.earns),
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

function errorInfo(err) {
  let code = err && typeof err.code === 'string' ? err.code : 'rejected';
  let message = err && err.message ? String(err.message) : String(err);
  if (code === 'rpc_failed') {
    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed.error === 'string') {
        code = parsed.error;
        if (parsed.message) message = String(parsed.message);
      }
    } catch { /* body was not JSON */ }
  }
  return { code, message };
}

function isTerminal(code) { return TERMINAL_CODES.has(code); }

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
    if (this.reach === 'ready' && this.inSession) await this.flush();
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

  async bank(attemptId, amount, durable) {
    const whole = Math.floor(Number(amount));
    if (!attemptId || !(whole > 0)) return;
    if (!durable || !readStore().attempts[attemptId]) {
      console.warn('[hub] earn not sent; attempt id was not saved');
      return;
    }
    const rec = await this._commitEarn(attemptId, whole);
    if (!rec) {
      console.warn('[hub] earn not sent; could not save the idempotency key');
      return;
    }
    if (rec.acked || rec.dropped) return;
    await this.init();
    if (this.reach !== 'ready' || !this.inSession) return;
    await this._sendEarn(attemptId);
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
    const store = readStore();
    for (const [id, rec] of Object.entries(store.earns)) {
      if (!rec.acked && !rec.dropped && rec.amount > 0) await this._sendEarn(id);
    }
    for (const [id, rec] of Object.entries(store.relics)) {
      if (!rec.acked && !rec.dropped && rec.key) await this._sendRelic(id);
    }
    const ex = pendingExchange();
    if (ex) await this._sendExchange(ex);
  }

  async _commitEarn(id, amount) {
    const wrote = await writeMerged((s) => {
      if (s.earns[id] && Number.isFinite(s.earns[id].amount)) return s;
      s.earns[id] = { amount, acked: false, dropped: false };
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

  async _sendEarn(id) {
    const rec = readStore().earns[id];
    if (!rec || rec.acked || rec.dropped || !(rec.amount > 0)) return;
    if (this.reach !== 'ready' || !this.inSession) return;
    try {
      const result = await this.sdk.earnTickets(rec.amount, EARN_REASON, id);
      // Standalone no-op is { balance: 0, capped: false } and must stay queued.
      if (!result || typeof result.balance !== 'number') return;
      if (result.balance === 0 && result.capped === false) return;
      if (!hasSession()) return;
      await writeMerged((s) => {
        const cur = s.earns[id];
        if (!cur || cur.dropped || cur.amount !== rec.amount) return s;
        cur.acked = true;
        return s;
      });
    } catch (err) {
      await this._failWrite(err, id);
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
    } catch (err) {
      const dropped = await this._failWrite(err, current.id);
      if (dropped && pendingExchange()?.id !== current.id) {
        const info = errorInfo(err);
        this.status = info.code === 'idempotency_mismatch' ? 'Exchange failed.' : 'Daily Verse cap reached.';
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
    console.warn('[hub] dropping write', info.code, key, info.message);
    await this._dropKey(key);
    await forgetOutbox(key);
    return true;
  }

  _dropKey(key) {
    return writeMerged((s) => {
      if (s.earns[key]) s.earns[key] = { ...s.earns[key], dropped: true, acked: false };
      for (const rec of Object.values(s.relics)) {
        if (rec && rec.key === key) { rec.dropped = true; rec.acked = false; }
      }
      if (s.exchange && s.exchange.id === key) s.exchange = { ...s.exchange, dropped: true, acked: false };
      return s;
    });
  }
}

export const hub = new HubBridge();
