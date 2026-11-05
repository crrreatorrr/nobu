import * as THREE from 'three';
import { beforeEach, afterEach, test, expect, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { Session } from '../src/game/session.js';
import { LEVELS, MAP_ORDER, isOpen } from '../src/levels/registry.js';
import { GAUNTLET_INFO, POLAROID_SPOTS } from '../src/levels/data/gauntlets.js';
import { Assets } from '../src/art/assets.js';
import { audio } from '../src/audio/audio.js';
import { input } from '../src/core/input.js';
import { save } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';
import { Stage } from '../src/world/stage.js';
import { TicketSystem } from '../src/entities/tickets.js';
import { BoneSwitch } from '../src/entities/props.js';
import { basePointsMax, totalDogs, masteryPoints } from '../src/game/progress.js';
import { resetWorld } from './helpers.js';
import { installDevTools } from '../src/dev.js';

const gradient = { addColorStop() {} };
const context = new Proxy({ measureText: () => ({ width: 100 }), createLinearGradient: () => gradient,
  createRadialGradient: () => gradient }, { get: (o, k) => o[k] || (() => {}) });
beforeEach(() => {
  resetWorld();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(Assets, 'url').mockImplementation((id) => `/${id}`);
  vi.spyOn(Assets, 'has').mockReturnValue(false); vi.spyOn(Assets, 'model').mockReturnValue(null);
  vi.spyOn(Assets, 'tex').mockReturnValue(new THREE.Texture()); vi.spyOn(Assets, 'tiled').mockReturnValue(new THREE.Texture());
  vi.spyOn(Assets, 'aspect').mockReturnValue(1); vi.spyOn(Assets, 'animate').mockReturnValue(null);
  vi.spyOn(audio, 'play').mockImplementation(() => {}); vi.spyOn(audio, 'playMusic').mockImplementation(() => {});
  vi.spyOn(audio, 'setRate').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); delete navigator.getGamepads; });
function screenGame(host = 1) {
  const screen = document.createElement('div');
  return Object.assign(Object.create(Game.prototype), { mapSel: host, exchangeOpen: false, player: { abilities: {} }, ui: { screen,
    setScreen(html) { screen.innerHTML = html; }, boneBoard: vi.fn(() => ''), hideHud: vi.fn(), bossHide: vi.fn(),
    trialTime: vi.fn(), clearScreen: vi.fn(), fade: vi.fn(async () => {}) },
    _worldLine: () => '', startLevel: vi.fn(), toMap: vi.fn() });
}
test('ships pinned gauntlets with no ordinary bones/dogs/trial/map nodes or base-percent inflation', () => {
  const ordinary = Object.fromEntries(Object.entries(LEVELS).filter(([, d]) => !d.gauntlet));
  for (const id of ['g1', 'g2', 'g3']) {
    expect(LEVELS[id]).toMatchObject({ gauntlet: true, bonus: true, bones: false, trial: false, shipped: true, dogs: {} });
    expect(MAP_ORDER).not.toContain(id); expect(isOpen(id, save.data)).toBe(false);
    save.data.gauntlets[id] = { polaroid: true, clear: true, allBoxes: true, flawless: true };
    expect(isOpen(id, save.data)).toBe(true);
  }
  expect(totalDogs(LEVELS)).toBe(54); expect(basePointsMax(LEVELS)).toBe(basePointsMax(ordinary));
  expect(masteryPoints(save.data, LEVELS) - masteryPoints(save.data, ordinary)).toBe(9);
});
test('map attaches one three-medal entry to its host and RB takes precedence over ordinary bite-confirm', () => {
  const game = screenGame(3);
  save.data.gauntlets.g2 = { found: true, clear: true, allBoxes: false, flawless: false, bestMs: 42125 };
  Game.prototype._drawMap.call(game);
  expect(game.ui.screen.querySelectorAll('[data-gauntlet-pin]')).toHaveLength(1);
  const entry = game.ui.screen.querySelector('[data-gauntlet-entry="g2"]');
  expect(entry.textContent).toContain('ASSEMBLY RUSH'); expect(entry.textContent).toContain('G / RB');
  expect(entry.textContent).toContain('0:42.13'); expect(entry.querySelectorAll('[data-gauntlet-medal]')).toHaveLength(3);
  vi.spyOn(input, 'pressed').mockImplementation((a) => a === 'gauntlet' || a === 'bite');
  vi.spyOn(input, 'confirmPressed').mockReturnValue(false);
  Game.prototype.updateMap.call(game); expect(game.startLevel).toHaveBeenCalledExactlyOnceWith('g2');
  game.startLevel.mockClear(); game.mapSel = 2;
  Game.prototype.updateMap.call(game); expect(game.startLevel).not.toHaveBeenCalled();
});
test('real keyboard G and pad RB expose gauntlet edges while RB retains the gameplay bite action', () => {
  input.codes.clear(); input.pressedQ.clear(); input.pad.held.clear();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG' })); input.poll();
  expect(input.pressed('gauntlet')).toBe(true);
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyG' }));
  navigator.getGamepads = vi.fn(() => [{ connected: true, axes: [0, 0],
    buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 5 })) }]);
  input.poll(); expect(input.pressed('gauntlet')).toBe(true); expect(input.pressed('bite')).toBe(true);
  input.poll(); expect(input.pressed('gauntlet')).toBe(false);
  input.codes.clear(); input.pad.held.clear(); input._pressed.clear();
});
test('gauntlet launch preserves story bookmark and forces trials off; locked launch is inert', async () => {
  const game = screenGame(); game.flyingMasks = [];
  const start = vi.spyOn(Session.prototype, 'startLevel').mockResolvedValue();
  save.data.lastLevel = 4;
  await Game.prototype.startLevel.call(game, 'g1'); expect(start).not.toHaveBeenCalled();
  save.data.gauntlets.g1 = { found: true };
  await Game.prototype.startLevel.call(game, 'g1', { trial: true });
  expect(game.session.def).toBe(LEVELS.g1); expect(game.session.trial).toBe(false);
  expect(save.data.lastLevel).toBe(4); expect(start).toHaveBeenCalledOnce();
});
test('dedicated result presents canonical claims without a second wallet write/bank, board or relic', async () => {
  const game = screenGame(), bank = vi.spyOn(hub, 'bank'), write = vi.spyOn(save, 'write');
  const stats = { broken: 12, breakables: 12, deaths: 0, ms: 45000, tickets: 5 };
  const session = { level: 'g1', def: LEVELS.g1, stats };
  Game.prototype.gauntletCleared.call(game, session, { tickets: 5, medals: ['clear', 'allBoxes', 'flawless'], record: { clear: true, allBoxes: true, flawless: true, bestMs: 44000 } });
  expect(game.completeMode).toBe('gauntlet'); expect(game.ui.screen.textContent).toContain('First clear: 5 Tickets');
  expect(game.ui.screen.textContent).toContain('LOCAL BEST 0:44.00'); expect(game.ui.boneBoard).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled(); expect(bank).not.toHaveBeenCalled(); expect(save.data.bonus.g1).toBeUndefined();
  expect(audio.setRate).toHaveBeenCalledWith(1);
  vi.spyOn(input, 'anyPressed').mockReturnValue(true);
  await Game.prototype.updateComplete.call(game, 2.4); expect(game.toMap).toHaveBeenCalledWith(1);
});
test('excluded practice result retains previously banked medal pips and best without advertising another first-clear reward', () => {
  const game = screenGame();
  save.data.gauntlets.g2 = { clear: true, allBoxes: true, flawless: false, bestMs: 39000 };
  Game.prototype.gauntletCleared.call(game, { level: 'g2', def: LEVELS.g2,
    stats: { broken: 20, breakables: 20, deaths: 0, ms: 28000 } }, { tickets: 0, medals: [] });
  expect(game.ui.screen.querySelector('[data-gauntlet-medal="allBoxes"]').textContent).toBe('●');
  expect(game.ui.screen.querySelector('[data-gauntlet-medal="flawless"]').textContent).toBe('○');
  expect(game.ui.screen.textContent).toContain('LOCAL BEST 0:39.00');
  expect(game.ui.screen.textContent).toContain('Deaths: 0'); expect(game.ui.screen.textContent).not.toContain('/3 deaths');
  expect(game.ui.screen.textContent).not.toContain('First clear');
});
test('real dev checker validates the active curved gauntlet rather than an empty generic pattern list', async () => {
  vi.useFakeTimers();
  const game = { startLevel: vi.fn(), player: { pos: new THREE.Vector3(), abilities: {} }, ui: {},
    session: { level: 'g1', deaths: 0, nextSeq: () => 1 } };
  const stage = new Stage(game, 1), tickets = new TicketSystem(game, stage);
  game.stage = game.session.stage = stage; game.tickets = tickets;
  LEVELS.g1.build(game, stage, tickets, { decor: false });
  installDevTools(game);
  expect(await window.T.gauntletCheck()).toEqual([]);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const first = stage.gauntletInfo.patterns[0]; first.pieces[1].dd += 30;
  try { expect((await window.T.gauntletCheck()).length).toBeGreaterThan(0); }
  finally { first.pieces[1].dd -= 30; delete window.T; vi.clearAllTimers(); stage.dispose(); }
});
test('gauntlet pause omits ordinary Bone Board and quit disposes the session before host map music', () => {
  const game = screenGame(), dispose = vi.fn(() => audio.setRate(1));
  game.session = { def: LEVELS.g3, level: 'g3', phase: 'level', deaths: 2, dispose,
    stage: {}, liveStats: () => ({ broken: 4, breakables: 12 }) };
  game._pauseItems = () => []; Game.prototype._drawPause.call(game);
  expect(game.ui.boneBoard).not.toHaveBeenCalled(); expect(game.ui.screen.textContent).toContain('Hamper Hop');
  save.data.open[4] = true;
  game._drawMap = vi.fn(); game._unlockMainChapters = vi.fn(); Game.prototype.toMap.call(game, 'g3');
  expect(dispose).toHaveBeenCalledOnce(); expect(game.mapSel).toBe(4); expect(game.session).toBeNull();
});
test('actual Session death keeps its ordinary death rate, then restores gauntlet tempo on respawn and invincibility expiry', async () => {
  vi.useFakeTimers();
  const noop = () => {}, game = { state: 'play', player: { pos: new THREE.Vector3(), body: {}, abilities: {},
    spawnAt: vi.fn(), update: noop }, mask: { setLevel: noop, snapTo: noop, update: noop },
    ui: { setHud: noop, deathCard: noop, fade: async () => {}, clearScreen: noop, showHud: noop },
    fx: { clear: noop, update: noop }, camera: { snap: noop, update: noop }, gameOver: vi.fn() };
  const session = new Session(game, 'g1'); game.session = session;
  session.stage = { entities: [], update: noop, followSky: noop };
  session.tickets = { list: [], restoreAfter: noop, clearFlying: noop, update: noop };
  session.projectiles = { clear: noop, update: noop };
  session.cp = { pos: new THREE.Vector3(), seq: 0, tickets: 0, levelTickets: 0, freedIds: [] };
  const lives = save.data.lives; session.onPlayerDeath('fall');
  expect(audio.setRate).toHaveBeenLastCalledWith(1);
  await vi.advanceTimersByTimeAsync(3000);
  expect(session.deaths).toBe(1); expect(game.player.spawnAt).toHaveBeenCalledOnce();
  expect(save.data.lives).toBe(lives - 1); expect(audio.setRate).toHaveBeenLastCalledWith(1.08);
  session.invincibleT = .01; session.update(.02);
  expect(session.invincibleT).toBe(0); expect(session.mask).toBe(2); expect(audio.setRate).toHaveBeenLastCalledWith(1.08);
  session.def = LEVELS[1]; session.invincibleT = .01; session.update(.02);
  expect(audio.setRate).toHaveBeenLastCalledWith(1);
});

for (const [id, info] of Object.entries(GAUNTLET_INFO)) test(`${id} actual host contains a reachable supported Polaroid which saves immediately and stays grey after checkpoint retry`, () => {
  vi.useFakeTimers();
  const game = { player: { pos: new THREE.Vector3(), body: { s: 0 }, abilities: {} }, ui: { tutorial: vi.fn(), banner: vi.fn() },
    fx: new Proxy({}, { get: () => () => {} }), camera: { shake() {} }, session: { level: info.host, deaths: 0, runSeed: 42, nextSeq: () => 1 } };
  const stage = new Stage(game, LEVELS[info.host].theme), tickets = new TicketSystem(game, stage); game.tickets = tickets;
  LEVELS[info.host].build(game, stage, tickets); tickets.finalize();
  const photo = stage.entities.find((e) => e.kind === 'polaroid' && e.id === id), [u, y, d] = POLAROID_SPOTS[id];
  expect(photo).toBeTruthy(); expect(photo.pos.distanceTo(stage.track.toWorld(d, u, y))).toBeLessThan(.001);
  if (id === 'g1') { const sw = stage.entities.find((e) => e instanceof BoneSwitch); sw.press(); vi.runAllTimers(); }
  const ground = stage.world.groundBelow(photo.pos.x, photo.pos.y + .1, photo.pos.z, .01);
  // Authored photo feet differ slightly from the flat platform top on rolling track;
  // their actual touch volume overlaps the supported player at all three spots.
  expect(Math.abs(ground - photo.pos.y)).toBeLessThan(.1);
  expect(photo.box.min.y).toBeLessThan(ground + 1.3); expect(photo.box.max.y).toBeGreaterThan(ground);
  game.player.pos.copy(photo.pos); photo.update(0); expect(photo.available).toBe(true);
  game.session.deaths = 1; photo.update(0); expect(photo.available).toBe(false); expect(photo.frameMaterial.opacity).toBe(.35);
  photo.onRespawn?.(); photo.update(0); expect(photo.onTouch()).toBe(false); expect(isOpen(id, save.data)).toBe(false);
  game.session.deaths = 0; expect(photo.onTouch()).toBe(true); expect(isOpen(id, save.data)).toBe(true);
  save.load(); expect(isOpen(id, save.data)).toBe(true); expect(photo.obj.visible).toBe(false);
  stage.dispose();
});
