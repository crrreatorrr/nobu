import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { LEVEL_DOGS } from '../src/levels/metadata.js';
import { kennelStatus, freedDogs, missingSecrets, allowedTints, selectedBuddy, selectedTint, crowdLayout } from '../src/game/kennelData.js';
import { applyFurTint } from '../src/player/furTint.js';
import { Buddy, addBuddy } from '../src/entities/buddy.js';
import { noticeKennelMilestones } from '../src/game/progress.js';
import { resetWorld } from './helpers.js';
import { Assets } from '../src/art/assets.js';
import { save, SAVE_KEY } from '../src/core/save.js';

const current = Object.fromEntries(Object.entries(LEVEL_DOGS).map(([id, dogs]) => [id, { id, shipped: true, bonus: ['ride', 'cave'].includes(id), name: id, dogs, hidden: { section: 'Secret', move: null } }]));
const legacyCounts={1:5,2:3,3:5,ride:2,cave:2};
const legacy=Object.fromEntries(Object.entries(current).filter(([id])=>Object.hasOwn(legacyCounts,id)).map(([id,def])=>[id,{...def,dogs:Object.fromEntries(Object.entries(def.dogs).slice(0,legacyCounts[id]))}]));
const currentTotal=Object.values(current).reduce((n,d)=>n+Object.keys(d.dogs).length,0);
const full = { ...current, future: { id: '6', shipped: true, name: 'House',
  dogs: Object.fromEntries(Array.from({ length: 54 - currentTotal }, (_, i) => [`shiba-${i}`, 'Room'])) } };
const all = (reg) => Object.values(reg).flatMap((d) => Object.keys(d.dogs).map((id) => `${d.id}:${id}`));
const dataAt = (n, reg = full) => ({ dogsFreed: Object.fromEntries(all(reg).slice(0, n).map((id) => [id, true])), kennel: {}, chainBadges: {}, boneBoard: {}, open: {} });
beforeEach(() => { vi.restoreAllMocks(); resetWorld(); });

describe('Kennel shipped milestone and stable dog data', () => {
  it('hides thresholds above36, unlocks exactly8/16/24/32/all36, and never counts unshipped dogs', () => {
    expect(kennelStatus(dataAt(0, current), current).milestones.map((m) => m.target)).toEqual([8, 16, 24, 32, 36]);
    expect(kennelStatus(dataAt(7, current), current).unlocks).toEqual([]);
    expect(kennelStatus(dataAt(8, current), current).unlocks).toEqual(['jukebox']);
    expect(kennelStatus(dataAt(16, current), current).unlocks).toEqual(['jukebox', 'buddy']);
    const d = dataAt(36, current); d.dogsFreed['5:shiba-a'] = true;
    expect(kennelStatus(d, current)).toMatchObject({ total: 36, freed: 36, unlocks: ['jukebox', 'buddy', 'fur', 'gallery', 'golden'] });
  });
  it('uses final8/16/24/32/42/54 thresholds and preserves released identity order', () => {
    expect(kennelStatus(dataAt(54), full).milestones.map((m) => m.target)).toEqual([8, 16, 24, 32, 42, 54]);
    expect(kennelStatus(dataAt(41), full).unlocks).not.toContain('sniffer');
    expect(kennelStatus(dataAt(42), full).unlocks).toContain('sniffer');
    expect(kennelStatus(dataAt(53), full).unlocks).not.toContain('golden');
    expect(kennelStatus(dataAt(54), full).unlocks).toContain('golden');
    expect(freedDogs(dataAt(3, current), current).map((d) => d.key)).toEqual(['1:shiba-a', '1:pug-a', '1:dalmatian-a']);
  });
  it('lists only missing secrets of open shipped levels and uses static section/move metadata', () => {
    const d = dataAt(1, current); d.open = { 1: true, 2: true }; d.boneBoard[1] = { hidden: true };
    const result = missingSecrets(d, current);
    expect(result.map((x) => x.id)).toEqual(['1', '2']);
    expect(result[0].hidden).toBeNull(); expect(result[0].dogs).toHaveLength(8);
    expect(result[1].hidden).toEqual({ section: 'Secret', move: null });
    expect(result[0].dogs[0]).toEqual({ id: 'pug-a', section: 'Treat Ledge' });
  });
  it('limits weak GPUs to12 dogs, counts +N, and gives deterministic distinct dance offsets', () => {
    const d = dataAt(54), low = crowdLayout(d, full, true), normal = crowdLayout(d, full);
    expect(low.dogs).toHaveLength(12); expect(low.hidden).toBe(42); expect(normal.dogs).toHaveLength(54);
    expect(normal.dogs[1].offset).toBe(.37); expect(crowdLayout(d, full)).toEqual(normal);
    expect(normal.dogs.every((x) => Math.abs(x.x) < 6 && Math.abs(x.z) < 4)).toBe(true);
  });
  it('gates Buddy to freed breeds and keeps all competitive, ride and arena contexts cosmetic-free', () => {
    const d = dataAt(16, current); d.kennel.buddy = 'pug';
    expect(selectedBuddy(d, current, { phase: 'level' })).toBe('pug');
    for (const key of ['trial', 'remix', 'rush', 'ride', 'board']) expect(selectedBuddy(d, current, { phase: 'level', [key]: true })).toBeNull();
    expect(selectedBuddy(d, current, { phase: 'boss' })).toBeNull();
    expect(selectedBuddy({ ...d, dogsFreed: { '1:shiba-a': true } }, current, { phase: 'level' })).toBeNull();
  });
  it('keeps fur locked until24 dogs and chompGold until5 shipped chain badges', () => {
    const d = dataAt(24); d.kennel.tint = 'chompGold';
    expect(allowedTints(dataAt(23), full)).toEqual(['none']);
    expect(allowedTints(d, full)).toEqual(['none', 'cream', 'shadow', 'ginger']);
    d.chainBadges = Object.fromEntries(['1', '2', '3', 'ride', 'cave'].map((id) => [id, true]));
    expect(allowedTints(d, full)).toContain('chompGold'); expect(selectedTint(d, full)).toBe(0xf2c14e);
    expect(selectedTint(d, full, { trial: true })).toBeNull();
    expect(selectedTint(d, full, { remix: true, rush: true })).toBe(0xf2c14e);
  });
});

describe('cosmetic transforms and persistence', () => {
  it('multiplies only Classic fur and restores its original color without compounding', () => {
    const model = { mats: { fur: new THREE.MeshLambertMaterial({ color: 0xf7efe0 }), eye: new THREE.MeshLambertMaterial({ color: 0xffffff }) } };
    const base = model.mats.fur.color.clone(); applyFurTint(model, 0xd08a4a); const first = model.mats.fur.color.clone();
    expect(first.equals(base.clone().multiply(new THREE.Color(0xd08a4a)))).toBe(true);
    applyFurTint(model, 0xd08a4a); expect(model.mats.fur.color.equals(first)).toBe(true);
    expect(model.mats.eye.color.getHex()).toBe(0xffffff); applyFurTint(model, null); expect(model.mats.fur.color.equals(base)).toBe(true);
  });
  it('tints all GLB body array materials without changing accessories or emissive effects', () => {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const mats = [new THREE.MeshStandardMaterial({ color: 0xffffff }), new THREE.MeshStandardMaterial({ color: 0xaaaaaa })];
    body.add(new THREE.Mesh(new THREE.BoxGeometry(), mats));
    const headSocket = new THREE.Bone(); body.add(headSocket);
    const hat = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0xff0000 })); hat.userData.nobuGear = true; headSocket.add(hat);
    const original = mats.map((m) => m.color.clone()); const model = { root, model: body };
    applyFurTint(model, 0xf3e3c3); expect(mats[0].color.getHex()).toBe(0xf3e3c3); expect(hat.material.color.getHex()).toBe(0xff0000);
    applyFurTint(model, null); expect(mats.every((m, i) => m.color.equals(original[i]))).toBe(true);
  });
  it('follows cosmetic offsets, teleports after8m orrespawn and never adds a collision box', () => {
    vi.spyOn(Assets, 'model').mockReturnValue(new THREE.Group()); vi.spyOn(Assets, 'animate').mockReturnValue(null);
    const player = { pos: new THREE.Vector3(), facing: 0 }, game = { player, session: { phase: 'level' } }, stage = { game };
    const buddy = new Buddy(stage, 'pug'); expect(buddy.pos.toArray()).toEqual([.8, 0, -1.6]); expect(buddy.box).toBeNull(); expect(buddy.interactive).toBe(false);
    player.pos.x = 2; buddy.update(.1); expect(buddy.pos.x).toBeGreaterThan(.8); expect(buddy.pos.x).toBeLessThan(2.8);
    player.pos.x = 20; buddy.update(.1); expect(buddy.pos.x).toBeCloseTo(20.8);
    buddy.onRespawn(); player.pos.x = 3; buddy.update(.1); expect(buddy.pos.x).toBeCloseTo(3.8);
    game.session.board = true; buddy.update(.1); expect(buddy.obj.visible).toBe(false);
    game.session.board = false; buddy.update(.1); expect(buddy.obj.visible).toBe(true);
    game.session.trial = true; buddy.update(.1); expect(buddy.obj.visible).toBe(false);
  });
  it('persists one-time Golden scene across reload and merges another tabsseen without replacing choices', () => {
    save.data.kennel = { seen: 3, buddy: 'pug', tint: 'cream', goldenSeen: true }; save.write(); save.load(); expect(save.data.kennel.goldenSeen).toBe(true);
    const disk = JSON.parse(localStorage.getItem(SAVE_KEY)); save.data.kennel.goldenSeen = false; save.data.kennel.buddy = 'shiba'; disk.kennel.goldenSeen = true; localStorage.setItem(SAVE_KEY, JSON.stringify(disk)); save.write();
    expect(save.data.kennel).toMatchObject({ goldenSeen: true, buddy: 'shiba', tint: 'cream' });
  });
});

it('retains milestone identities when shipped-total Golden precedes future Fur', () => {
  const d = dataAt(17, legacy); d.kennel.seen = 3;
  expect(noticeKennelMilestones(d, legacy)).toEqual([]);
  expect(d.kennel.seenMilestones).toEqual({ jukebox: true, buddy: true, golden: true });
  Object.assign(d.dogsFreed, dataAt(24).dogsFreed);
  expect(noticeKennelMilestones(d, full)).toEqual(['fur']);
  expect(noticeKennelMilestones(d, full)).toEqual([]);
});
it('migrates count-only milestones only from earned current unlocks, idempotently, and unions tab flags', () => {
  const d = dataAt(36, current); d.v = 3; d.kennel.seen = 5;
  localStorage.setItem(SAVE_KEY, JSON.stringify(d)); save.load();
  expect(save.data.kennel.seenMilestones).toEqual({ jukebox: true, buddy: true, fur: true, gallery: true, golden: true });
  save.write(); save.load(); expect(save.data.kennel.seenMilestones.golden).toBe(true);
  const disk = JSON.parse(localStorage.getItem(SAVE_KEY)); disk.kennel.seenMilestones.fur = true; localStorage.setItem(SAVE_KEY, JSON.stringify(disk));
  save.data.kennel.seenMilestones.gallery = true; save.write();
  expect(save.data.kennel.seenMilestones).toMatchObject({ jukebox: true, buddy: true, golden: true, fur: true, gallery: true });
  localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 3, dogsFreed: {}, kennel: { seen: 6 } })); save.load();
  expect(save.data.kennel.seenMilestones).toEqual({});
});

it('does not instantiate Buddy in actual Session board contexts', () => {
  const d = dataAt(16, current); d.kennel.buddy = 'pug';
  const session = { phase: 'level', board: true, stage: { add: vi.fn() }, game: { player: { ride: null } } };
  expect(addBuddy(session, d, current)).toBeNull(); expect(session.stage.add).not.toHaveBeenCalled();
});
