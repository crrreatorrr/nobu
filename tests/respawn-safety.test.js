// Every Snacks checkpoint in every stage: it stands on ground, and a player who respawns there and
// touches nothing is still alive three seconds later (no patrol, hazard or pursuer on the spot).
// The vacuum and the raft drive themselves, so "idle" there means riding on with no steering: the
// first thing an unsteered raft reaches is the whirlpool 32 m past the 204 m Snacks of Smog Rapids,
// 2.9 s after the respawn, so a ride is held to 2.75 s.
import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js', () => ({ Assets: {
  has: () => false, model: () => null, animate: () => null, aspect: () => 1,
  tex: () => new THREE.Texture({ width: 16, height: 16 }),
  tiled: () => new THREE.Texture({ width: 16, height: 16 }), url: () => '',
} }));
vi.mock('../src/audio/audio.js', () => ({ audio: new Proxy({}, { get: (o, k) => o[k] ?? (o[k] = vi.fn()) }) }));
vi.mock('../src/entities/fx.js', async (original) => {
  const module = await original();
  return { ...module, FX: class {
    constructor() { return new Proxy({ sparks: { spawn: vi.fn() } }, { get: (o, k) => o[k] ?? (o[k] = vi.fn()) }); }
  } };
});

const { Player } = await import('../src/player/player.js');
const { GameCamera } = await import('../src/camera/camera.js');
const { Game } = await import('../src/game/game.js');
const { Session } = await import('../src/game/session.js');
const { Snacks } = await import('../src/entities/breakables.js');
const { Enemy } = await import('../src/entities/enemies.js');
const { save } = await import('../src/core/save.js');
const { input } = await import('../src/core/input.js');
const { RESPAWN_INVULN_SEC } = await import('../src/config/difficulty.js');
const { resetWorld } = await import('./helpers.js');

const noop = () => {};
const STAGES = [1, 'ride', 2, 'cave', 3, 4, 6, 5];
const IDLE_SEC = 3, IDLE_RIDE_SEC = 2.75;
const DT = 1 / 60;

function open(level) {
  const screen = document.createElement('div');
  const game = Object.assign(Object.create(Game.prototype), { state: 'play', _pendingMainUnlocks: [], flyingMasks: [],
    loadout: { effects: {}, cosmeticSlots: () => ({}) }, titleScene: new THREE.Scene(),
    mask: { attach: noop, setLevel: noop, snapTo: noop, update: noop },
    ui: new Proxy({ screen, talking: false, fade: async () => {}, say: async () => {} }, { get: (o, k) => o[k] ?? (o[k] = vi.fn()) }) });
  game.player = new Player(game); game.camera = new GameCamera(1.5);
  const s = game.session = new Session(game, level, {});
  const stage = s._newStage(s.def.theme);
  const info = s.def.build(game, stage, s.tickets);
  game.player.setRide(info.ride || null);
  stage.finalize(); s.tickets.finalize();
  s.info = info; s.chase = info.chase || null; s._attachActors(info);
  s.phase = 'level'; s.loading = false; s.busy = false;
  if (s.chase) s._startChase(s.chase.s, 1.8, true);
  return { game, s, stage };
}

describe.each(STAGES)('checkpoints of stage %s', (level) => {
  let f, snacks;
  beforeAll(() => {
    resetWorld(); save.data.godMode = false; save.data.lives = 99;
    const ctx = new Proxy({ measureText: () => ({ width: 50 }), createRadialGradient: () => ({ addColorStop: noop }), createLinearGradient: () => ({ addColorStop: noop }),
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (o, k) => o[k] ?? noop, set: (o, k, v) => ((o[k] = v), true) });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('');
    input.state.x = 0; input.state.y = 0;
    f = open(level);
    snacks = f.stage.entities.filter((e) => e instanceof Snacks && e.kind === 'snacks' && e.enabled !== false)
      .map((e) => ({ e, d: Math.round(f.stage.track.project(e.pos.x, e.pos.z).s * 2) / 2 })).sort((a, b) => a.d - b.d);
  });
  afterAll(() => { f?.s.dispose?.(); vi.restoreAllMocks(); });

  it('each stands on ground, so a respawn there never starts in a pit', () => {
    expect(snacks.length).toBeGreaterThan(1);
    const floating = snacks.filter(({ e }) => !(Math.abs(e.pos.y - f.stage.world.groundBelow(e.pos.x, e.pos.y + 0.3, e.pos.z, 0.2)) < 0.6)).map((c) => c.d);
    expect(floating).toEqual([]);
  });

  it('no enemy patrol walks over one', () => {
    const crossed = [];
    for (const { e, d } of snacks) for (const foe of f.stage.entities) {
      if (!(foe instanceof Enemy) || !foe.home || Math.abs(foe.home.y - e.pos.y) > 1.5) continue;
      const v = foe.opts.dirV || (foe.opts.axis === 'z' ? { x: 0, z: 1 } : { x: 1, z: 0 }), range = foe.opts.range ?? 2.5;
      const along = Math.max(-range, Math.min(range, (e.pos.x - foe.home.x) * v.x + (e.pos.z - foe.home.z) * v.z));
      const gap = Math.hypot(e.pos.x - foe.home.x - v.x * along, e.pos.z - foe.home.z - v.z * along);
      if (gap < 1.5) crossed.push(`${d} m: ${foe.constructor.name} passes ${gap.toFixed(1)} m away`);
    }
    expect(crossed).toEqual([]);
  });

  it(`an idle player is alive ${IDLE_SEC} s (${IDLE_RIDE_SEC} s on a ride) after respawning at each`, () => {
    const { game, s } = f, p = game.player, deaths = [];
    let cause = '';
    s.onPlayerDeath = (type) => { cause ||= String(type); };
    for (const { e, d } of snacks) {
      // Reach the checkpoint, play on for a moment, then respawn exactly as a death does.
      p.spawnAt(e.pos, 0); e.hit(p);
      expect(s.cp.pos.distanceTo(e.pos), `checkpoint ${d} was taken`).toBeLessThan(3);
      for (let i = 0; i < 30; i++) s.update(DT);
      cause = ''; p.mode = 'normal'; s.dying = false;
      s.respawn();
      expect(p.invulnT).toBe(RESPAWN_INVULN_SEC);
      let t = 0;
      const need = p.ride ? IDLE_RIDE_SEC : IDLE_SEC;
      while (t < need && !p.dead && !cause) { s.update(DT); t += DT; }
      if (p.dead || cause) deaths.push(`${d} m: ${cause || p.deathType} after ${t.toFixed(2)} s`);
      p.mode = 'normal'; s.dying = false;
    }
    expect(deaths).toEqual([]);
  });
});
