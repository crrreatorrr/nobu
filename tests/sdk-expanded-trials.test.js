import { webcrypto } from 'node:crypto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Deliberately bypass Vitest's @metaverse/hub-sdk mock alias: exercise generated upstream code.
import {
  createHubSdk, createNakamaClient, memoryKeyValue, mintMockTicket,
  NOBU_TRIAL_FLOOR_MS, NOBU_TRIAL_CEIL_MS, HUB_OUTBOX_DB, HubEvent,
} from '../vendor/hub-sdk/dist/index.js';
import { TRIAL_FLOOR_MS, TRIAL_CEIL_MS, TRIAL_LEVELS, HUB_LAYOUT, canUploadTrial } from '../src/config/trials.js';
import { enqueue, flushQueue, readQueue } from '../src/hub/scoreQueue.js';

const NOW = Date.parse('2026-11-05T05:00:00Z');
const FLOORS = { 1: 15000, 2: 15000, 3: 12000, '1v2': 25700, '2v2': 26000, '3v2': 20600, 4: 24000, 6: 30000, 5: 21000 };
const variants = Object.entries(FLOORS);
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('indexedDB', new IDBFactory());
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

async function mockSession() {
  const local = memoryKeyValue();
  let hash = `#t=${await mintMockTicket({ game: 'nobu', playerId: 'player', ranked: false, now: NOW })}`;
  const sdk = createHubSdk({ useMock: true, now: () => NOW, local, session: memoryKeyValue(),
    readHash: () => hash, writeHash: value => { hash = value; } });
  expect(await sdk.init('nobu')).toMatchObject({ playerId: 'player', ranked: false });
  return { sdk, local };
}

function jwt(user, sid, game = 'nobu') {
  return `e30.${Buffer.from(JSON.stringify({ uid: user, exp: NOW / 1000 + 3600,
    vrs: { sid, scope: 'game', game, ranked: '0' } })).toString('base64url')}.test`;
}
function wire() {
  const sent = [], answers = new Map(), closed = new Set();
  const relics = ['tidebreaker_belt', 'breakwater_coin', 'invalid'];
  const identities = { a: ['player', 'a'], b: ['player', 'b'], other: ['other', 'c'], nextOther: ['other', 'd'] };
  const tokens = Object.fromEntries(Object.entries(identities).map(([key, [user, sid]]) => [key, jwt(user, sid)]));
  tokens.foreign = jwt('player', 'foreign', 'hpos10i');
  tokens.foreignNext = jwt('player', 'foreign-next', 'hpos10i');
  const reply = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) });
  const fetchImpl = vi.fn(async (url, init) => {
    const path = new URL(url).pathname, body = JSON.parse(init.body), authorization = init.headers.Authorization;
    sent.push({ path, body, authorization });
    if (path.endsWith('/authenticate/custom')) {
      expect(authorization).toBe(`Basic ${btoa('test-key:')}`);
      expect(body.id.startsWith('t:')).toBe(true);
      return reply({ token: tokens[body.id.slice(2)], refresh_token: 'refresh' });
    }
    if (path.endsWith('/profile.get')) return reply({ relics: [...relics], ticketsCapLeft: 100, serverTime: NOW });
    if (closed.has(authorization)) return reply({ error: 'session_closed' });
    if (path.endsWith('/score.submit')) return reply({ accepted: true, posted: true, value: body.value, order: 'asc' });
    if (path.endsWith('/leaderboard.top')) return reply({ boardId: body.boardId, variant: body.variant, order: 'asc', rows: [], me: null });
    const answer = answers.get(body.key);
    if (answer === 'offline') throw new TypeError('offline fixture');
    if (answer === '503') return reply({ message: 'unavailable' }, 503);
    if (answer) return reply({ error: answer, message: answer });
    if (path.endsWith('/tickets.earn')) return reply({ balance: 20, capped: false });
    if (path.endsWith('/session.event')) { relics.push('cones_tip'); return reply({ granted: 'cones_tip', granted_items: [] }); }
    throw new Error(`Unexpected local fixture RPC ${path}`);
  });
  const client = createNakamaClient({ serverUrl: 'https://fixture.invalid', serverKey: 'test-key', fetchImpl });
  const session = memoryKeyValue();
  let hash = '';
  const open = async (name, game = 'nobu') => {
    hash = name ? `#t=${name}` : '';
    const sdk = createHubSdk({ client, now: () => NOW, local: memoryKeyValue(), session,
      readHash: () => hash, writeHash: value => { hash = value; } });
    await sdk.init(game);
    return sdk;
  };
  return { open, sent, answers, closed, tokens };
}
async function rows() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HUB_OUTBOX_DB, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, read = db.transaction('writes').objectStore('writes').getAll();
      read.onsuccess = () => { db.close(); resolve(read.result); };
      read.onerror = () => { db.close(); reject(read.error); };
    };
  });
}

describe('real vendored expanded trial contract', () => {
  it('matches every Classic/current/new floor and ceiling with current public gates', () => {
    expect(NOBU_TRIAL_FLOOR_MS).toEqual(FLOORS);
    expect(TRIAL_FLOOR_MS).toEqual(FLOORS);
    expect(NOBU_TRIAL_CEIL_MS).toBe(1800000);
    expect(TRIAL_CEIL_MS).toBe(NOBU_TRIAL_CEIL_MS);
    expect(TRIAL_LEVELS).toEqual([1, 2, 3, 4, 6, 5]);
    expect(HUB_LAYOUT).toEqual({ 1: 2, 2: 2, 3: 2 });
  });
  it.each(variants)('mock %s accepts inclusive bounds, keeps fastest independent rows and grants no economy', async (variant, floor) => {
    const { sdk, local } = await mockSession();
    for (const [bad, code] of [[floor - 1, 'implausible_score'], [floor + .5, 'bad_score'], [1800001, 'implausible_score']])
      await expect(sdk.submitScore('nobu_trial_time', bad, { level: variant })).rejects.toMatchObject({ code });
    expect(await sdk.submitScore('nobu_trial_time', 1800000, { level: variant })).toMatchObject({ accepted: true, value: 1800000 });
    expect(await sdk.submitScore('nobu_trial_time', floor, { level: variant })).toMatchObject({ accepted: true, value: floor, order: 'asc' });
    expect(await sdk.submitScore('nobu_trial_time', floor + 1, { level: variant })).toMatchObject({ posted: false, value: floor });
    expect(await sdk.getLeaderboard('nobu_trial_time', { variant })).toMatchObject({ variant, order: 'asc', me: { value: floor, userId: 'player' } });
    const another = variant === '1' ? '2' : '1';
    expect((await sdk.getLeaderboard('nobu_trial_time', { variant: another })).rows).toEqual([]);
    expect(local.getItem('hub:tickets:nobu')).toBeNull();
    expect(local.getItem('hub:verse')).toBeNull();
    expect(local.getItem('hub:relics')).toBeNull();
    expect(await sdk.submitScore('nobu_trial_time', floor, { level: variant, godMode: true })).toEqual({ accepted: false, reason: 'god_mode' });
  });
  it.each(['4v2', '6v2', '5v2', '0', '7', '__proto__', 'constructor'])('mock rejects unsupported/prototype variant %s', async variant => {
    const { sdk } = await mockSession();
    await expect(sdk.submitScore('nobu_trial_time', 50000, { level: variant })).rejects.toMatchObject({ code: 'bad_variant' });
    await expect(sdk.getLeaderboard('nobu_trial_time', { variant })).rejects.toMatchObject({ code: 'bad_variant' });
  });
  it.each(variants)('live %s forwards canonical score/read payloads using session token only', async (variant, floor) => {
    const h = wire(), sdk = await h.open('a');
    const meta = { level: /^\d$/.test(variant) ? Number(variant) : variant, v: variant.includes('v2') ? 2 : 1, deaths: 2, freezeMs: 3000 };
    expect(await sdk.submitScore('nobu_trial_time', floor, meta)).toMatchObject({ accepted: true, value: floor });
    expect(await sdk.getLeaderboard('nobu_trial_time', { variant, limit: 10 })).toMatchObject({ variant, order: 'asc' });
    expect(h.sent.filter(call => call.path.endsWith('/score.submit'))).toEqual([{ path: '/v2/rpc/score.submit', body: { boardId: 'nobu_trial_time', value: floor, meta, godMode: false }, authorization: `Bearer ${h.tokens.a}` }]);
    expect(h.sent.find(call => call.path.endsWith('/leaderboard.top'))).toMatchObject({ body: { boardId: 'nobu_trial_time', variant, limit: 10 }, authorization: `Bearer ${h.tokens.a}` });
    expect(h.sent.some(call => /tickets|session.event|save\./.test(call.path))).toBe(false);
    expect(await rows()).toEqual([]);
    expect(await sdk.init('nobu')).toMatchObject({ relics: ['tidebreaker_belt', 'breakwater_coin'] });
  });
  it('standalone real mock/live submits no score, economy, or save', async () => {
    const mock = createHubSdk({ useMock: true, local: memoryKeyValue(), session: memoryKeyValue(), readHash: () => '' });
    await mock.init('nobu');
    const h = wire(), live = await h.open();
    for (const sdk of [mock, live]) {
      expect(await sdk.submitScore('nobu_trial_time', 30000, { level: 4 })).toBeUndefined();
      expect(await sdk.reportEvent(HubEvent.NobuBossDefeated, { boss: 'cone' }, 'standalone')).toEqual({});
      expect(await sdk.loadSave()).toEqual({ data: null, updatedAt: 0 });
    }
    expect(h.sent).toEqual([]);
  });
  it.each(['1v2', '2v2', '3v2', '4', '6', '5'])('queues and flushes owned current %s through the real SDK without crossing owners', async variant => {
    const floor = FLOORS[variant], level = variant.includes('v2') ? variant : Number(variant);
    expect(canUploadTrial(variant)).toBe(true);
    expect(enqueue('player', variant, floor - 1)).toBe(false);
    expect(enqueue('player', variant, floor)).toBe(true);
    expect(enqueue('other', variant, floor + 1)).toBe(true);
    const h = wire(), sdk = await h.open('a');
    expect(await flushQueue(sdk, 'player')).toMatchObject({ sent: 1, acked: 1, dropped: 0, kept: 0 });
    const scores = h.sent.filter(call => call.path.endsWith('/score.submit'));
    expect(scores).toEqual([{ path: '/v2/rpc/score.submit', body: {
      boardId: 'nobu_trial_time', value: floor,
      meta: { level, ...(variant.includes('v2') ? { layout: 2 } : {}) }, godMode: false,
    }, authorization: `Bearer ${h.tokens.a}` }]);
    expect(readQueue().rows.player).toBeUndefined();
    expect(readQueue().rows.other[`nobu_trial_time:${variant}`]).toMatchObject({ ms: floor + 1 });
    expect(readQueue().posted.player[variant]).toBe(floor);
    expect(h.sent.some(call => /tickets|session.event|save\./.test(call.path))).toBe(false);
    expect(await rows()).toEqual([]);
    for (const invalid of ['1', '2', '3', '4v2', '6v2', '5v2', '7'])
      expect(enqueue('player', invalid, 90000)).toBe(false);
  });
});

describe('real SDK 0.6.4 durable economy outbox', () => {
  it.each(['amount_over_rule', 'idempotency_mismatch', 'session_cap'])('terminal 2xx %s drops only refused row and never poisons later init', async code => {
    const h = wire(), sdk = await h.open('a');
    h.answers.set('keep', 'offline');
    await expect(sdk.earnTickets(20, 'level_end', 'keep')).rejects.toThrow('offline fixture');
    h.answers.set('refuse', code);
    await expect(sdk.earnTickets(20, 'level_end', 'refuse')).rejects.toMatchObject({ code });
    expect((await rows()).map(row => row.key)).toEqual(['keep']);
    h.answers.delete('keep');
    await h.open('b');
    await h.open();
    expect(await rows()).toEqual([]);
    expect(h.sent.filter(call => call.body.key === 'refuse')).toHaveLength(1);
  });
  it('a queued offline refusal is dropped during init while a transient row retries identically', async () => {
    const h = wire(), sdk = await h.open('a');
    h.answers.set('late', 'offline');
    await expect(sdk.earnTickets(20, 'level_end', 'late')).rejects.toThrow();
    h.answers.set('late', 'amount_over_rule');
    await expect(h.open('b')).resolves.toBeDefined();
    expect(await rows()).toEqual([]);
    h.answers.set('retry', '503');
    await expect(sdk.earnTickets(20, 'level_end', 'retry')).rejects.toMatchObject({ code: 'rpc_failed', status: 503 });
    const [saved] = await rows();
    expect(saved).toMatchObject({ key: 'retry', gameId: 'nobu', body: { amount: 20, reason: 'level_end' } });
    const attempts = () => h.sent.filter(call => call.body.key === 'retry').length;
    const before = attempts();
    // 0.6.4 keeps a non-final row queued and does not reject init.
    await expect(h.open('b')).resolves.toBeDefined();
    expect(attempts()).toBe(before + 1);
    expect((await rows())[0].body).toEqual(saved.body);
    h.answers.delete('retry');
    await h.open('b');
    expect(await rows()).toEqual([]);
    expect(h.sent.filter(call => call.body.key === 'retry').at(-1)).toMatchObject({ body: { ...saved.body, key: saved.key }, authorization: `Bearer ${h.tokens.b}` });
  });
  it('rate_limited remains retryable and a later accepted send removes its durable row', async () => {
    const h = wire(), sdk = await h.open('a');
    h.answers.set('rate', 'rate_limited');
    await expect(sdk.earnTickets(20, 'level_end', 'rate')).rejects.toMatchObject({ code: 'rate_limited' });
    const attempts = () => h.sent.filter(call => call.body.key === 'rate').length;
    const before = attempts();
    // 0.6.4 keeps a rate-limited row queued and does not reject init.
    await expect(h.open('a')).resolves.toBeDefined();
    expect(attempts()).toBe(before + 1);
    expect((await rows()).map(row => row.key)).toEqual(['rate']);
    h.answers.delete('rate');
    await h.open('b');
    expect(await rows()).toEqual([]);
  });
  it('the same player cannot carry a closed row from another game on the Nobu session', async () => {
    const h = wire(), foreign = await h.open('foreign', 'hpos10i');
    h.closed.add(`Bearer ${h.tokens.foreign}`);
    await expect(foreign.earnTickets(20, 'level_end', 'foreign')).rejects.toMatchObject({ code: 'session_closed' });
    await h.open('a');
    expect((await rows())[0]).toMatchObject({ gameId: 'hpos10i', token: h.tokens.foreign });
    expect(h.sent.filter(call => call.body.key === 'foreign').every(call => call.authorization === `Bearer ${h.tokens.foreign}`)).toBe(true);
    await h.open('foreignNext', 'hpos10i');
    expect(await rows()).toEqual([]);
    expect(h.sent.filter(call => call.body.key === 'foreign').at(-1).authorization).toBe(`Bearer ${h.tokens.foreignNext}`);
  });
  it('closed sessions rebind only to same player and game, preserving key/body and Cone grant', async () => {
    const h = wire(), sdk = await h.open('a');
    h.closed.add(`Bearer ${h.tokens.a}`);
    await expect(sdk.reportEvent(HubEvent.NobuBossDefeated, { boss: 'cone' }, 'cone')).rejects.toMatchObject({ code: 'session_closed' });
    const [saved] = await rows();
    const other = await h.open('other');
    expect(other.getSession().playerId).toBe('other');
    expect((await rows())[0].token).toBe(h.tokens.a);
    expect(h.sent.filter(call => call.body.key === 'cone').every(call => call.authorization === `Bearer ${h.tokens.a}`)).toBe(true);
    const mine = await h.open('b');
    expect(await rows()).toEqual([]);
    expect(h.sent.filter(call => call.body.key === 'cone').at(-1)).toMatchObject({ authorization: `Bearer ${h.tokens.b}`, body: { ...saved.body, key: saved.key } });
    expect(await mine.init('nobu')).toMatchObject({ relics: expect.arrayContaining(['cones_tip']) });
  });
});
