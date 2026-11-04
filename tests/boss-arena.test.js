import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { World, rideGround } from '../src/world/physics.js';
import { ArenaTiles, CandlePillar, Pedestal, ConveyorZone } from '../src/bosses/arena.js';
import { Projectiles, Beam } from '../src/bosses/common.js';
import { segmentDistanceSq, segmentBoxTime } from '../src/bosses/geometry.js';
import { audio } from '../src/audio/audio.js';

function fixture() {
  const player = { pos: new THREE.Vector3(0, 0, 0), vel: new THREE.Vector3(), forward: new THREE.Vector3(0, 0, 1),
    body: { grounded: true, ground: null }, biteT: -1, trap: vi.fn(), cone: vi.fn(), hurt: vi.fn(), bounce: vi.fn() };
  const game = { player, camera: { shake: vi.fn() }, fx: { puff: vi.fn(), smokeCard: vi.fn(), dust: vi.fn(), explosion: vi.fn() } };
  const stage = { game, scene: new THREE.Scene(), world: new World() };
  return { player, game, stage };
}
beforeEach(() => {
  vi.spyOn(audio, 'play').mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ beginPath() {}, arc() {}, stroke() {}, fill() {}, moveTo() {}, lineTo() {} });
});
afterEach(() => vi.restoreAllMocks());

describe('boss arena collision', () => {
  it('drops flipped tiles after their tell and restores collisions and position', () => {
    const { stage } = fixture();
    const tiles = new ArenaTiles(stage, { cols: 3, rows: 3, size: 2, y: 4 });
    const tile = tiles.tiles[4];
    expect(stage.world.groundBelow(0, 5, 0)).toBe(4);
    tiles.flip(1, 1, 2); tiles.update(0.49);
    expect(tile.solid.enabled).toBe(true);
    tiles.update(0.02);
    expect(tile.solid.enabled).toBe(false);
    expect(stage.world.groundBelow(0, 5, 0)).toBe(-Infinity);
    tiles.update(2); expect(tile.solid.enabled).toBe(true);
    expect(tile.mesh.position.y).toBe(-0.15);
  });
  it('only crumbles the edge and resets the whole arena on respawn', () => {
    const { stage, player } = fixture();
    const tiles = new ArenaTiles(stage, { cols: 3, rows: 3 });
    tiles.crumbleRing();
    expect(tiles.tiles.filter(t => t.crumble)).toHaveLength(8);
    player.body.ground = tiles.tiles[0].solid;
    tiles.update(0.6); expect(tiles.tiles[0].solid.enabled).toBe(false);
    tiles.onRespawn();
    expect(tiles.tiles.every(t => t.solid.enabled && !t.crumble)).toBe(true);
  });
  it('carries a rider with pillar motion through the existing moving-solid delta', () => {
    const { stage, player } = fixture();
    const pillar = new CandlePillar(stage, 0, 0);
    player.body.pos = player.pos; player.body.ground = pillar.solid;
    stage.world.beginFrame(); pillar.target = 3; pillar.update(0.1);
    rideGround(player.body);
    expect(player.pos.y).toBeCloseTo(pillar.pos.y);
    expect(pillar.pos.y).toBeGreaterThan(0);
    pillar.onRespawn(); expect(pillar.pos.y).toBe(0);
  });
  it('raises a pedestal over one second and restores its start height', () => {
    const { stage } = fixture(); const pedestal = new Pedestal(stage, 2, 3, { h: 2 });
    expect(pedestal.pos.y).toBe(0);
    pedestal.update(0.5); expect(pedestal.solid.max.y).toBe(1);
    pedestal.update(0.5); expect(pedestal.solid.max.y).toBe(2);
    pedestal.onRespawn(); expect(pedestal.solid.max.y).toBe(0);
  });
  it('pushes only grounded players inside the conveyor rectangle at its height', () => {
    const { stage, player } = fixture();
    const rug = new ConveyorZone(stage, { x0: -1, x1: 1, z0: -1, z1: 1, y: 0 }, { x: 1, z: 0 }, 4);
    rug.update(); expect(player.pushX).toBe(4);
    player.pushX = 0; player.body.grounded = false; rug.update(); expect(player.pushX).toBe(0);
    player.body.grounded = true; player.pos.x = 2; rug.update(); expect(player.pushX).toBe(0);
  });
});

describe('new shared projectiles', () => {
  it('lands a cage, traps once, blocks feathers and beams, and clears its cover', () => {
    const { stage, game, player } = fixture(); const projectiles = new Projectiles(game, stage);
    const cage = projectiles.cage(0, 0);
    projectiles.update(0.9);
    expect(player.trap).toHaveBeenCalledOnce();
    expect(cage.cover.enabled).toBe(true);
    projectiles.feather(new THREE.Vector3(-4, 0.7, 0), new THREE.Vector3(1, 0, 0), 8);
    projectiles.update(1);
    expect(projectiles.list).toHaveLength(1);
    expect(player.hurt).not.toHaveBeenCalled();
    const beam = new Beam(stage.scene);
    beam.set(new THREE.Vector3(-5, 1, 0), new THREE.Vector3(5, 0, 0), true);
    player.pos.set(5, 0, 0); expect(beam.hits(player)).toBe(false);
    projectiles.clear();
    expect(cage.cover.enabled).toBe(false);
    expect(stage.scene.userData.bossCover).toHaveLength(0);
    expect(beam.hits(player)).toBe(true);
  });
  it('keeps scratch lines and rings alive after contact, with jump and Dust Dash counters', () => {
    const { stage, game, player } = fixture(); const projectiles = new Projectiles(game, stage);
    projectiles.scratch(new THREE.Vector3(-2, 0, 0), new THREE.Vector3(2, 0, 0));
    projectiles.update(0.01); expect(player.hurt).toHaveBeenCalledOnce();
    expect(projectiles.list).toHaveLength(1);
    player.pos.y = 0.5; projectiles.update(0.01); expect(player.hurt).toHaveBeenCalledOnce();
    projectiles.clear(); player.hurt.mockClear(); player.pos.set(3.4, 0, 0);
    projectiles.wakeRing(0, 0); player.dustDashT = 0.2;
    projectiles.update(0.01); expect(player.hurt).not.toHaveBeenCalled();
    player.dustDashT = 0; projectiles.update(0.01); expect(player.hurt).toHaveBeenCalledOnce();
    expect(projectiles.list).toHaveLength(1);
  });
  it('uses a status instead of damage when the slow homing cone connects', () => {
    const { stage, game, player } = fixture(); const projectiles = new Projectiles(game, stage);
    projectiles.slowHomer(new THREE.Vector3(0, 0.65, 0.2));
    projectiles.update(0.01);
    expect(player.cone).toHaveBeenCalledWith(3);
    expect(player.hurt).not.toHaveBeenCalled();
  });
  it('sweeps a jumpable cable and lands a generic falling object once', () => {
    const { stage, game, player } = fixture(); const projectiles = new Projectiles(game, stage);
    player.pos.set(0, 0, 2);
    projectiles.cableArc(new THREE.Vector3(), 4, 0, 0, 0.5);
    projectiles.update(0.1); expect(player.hurt).toHaveBeenCalledOnce();
    player.pos.y = 0.7; projectiles.update(0.1); expect(player.hurt).toHaveBeenCalledOnce();
    projectiles.clear(); player.hurt.mockClear(); player.pos.set(0, 0, 0);
    const onLand = vi.fn(); projectiles.falling(0, 0, { delay: 0.4, kind: 'leg', onLand });
    projectiles.update(0.4); projectiles.update(0.1);
    expect(player.hurt).toHaveBeenCalledOnce(); expect(onLand).toHaveBeenCalledOnce();
  });
  it('measures segment widths and solid cover intersections including parallel misses', () => {
    expect(segmentDistanceSq(0, 1, -2, 0, 2, 0)).toBe(1);
    const box = { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 2, z: 1 } };
    expect(segmentBoxTime({ x: -2, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }, box)).toBe(0.25);
    expect(segmentBoxTime({ x: -2, y: 3, z: 0 }, { x: 2, y: 3, z: 0 }, box)).toBe(Infinity);
  });
});
