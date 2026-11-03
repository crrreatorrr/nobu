import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '../src/audio/audio.js';
import { save } from '../src/core/save.js';
import { itemById, itemEffects, NOBU_ITEMS } from '../src/gear/catalog.js';
import { Loadout } from '../src/gear/loadout.js';
import { readNobuOwnership } from '../src/gear/ownership.js';
import { hub } from '../src/hub/hubBridge.js';
import { Assets } from '../src/art/assets.js';
import { buildChampionsCrown, CROWN_GLB, dressNobuModel } from '../src/player/accessories.js';
import { Player, TUNING } from '../src/player/player.js';
import { readyHub, resetWorld } from './helpers.js';
import { sdk } from './sdkState.js';

const CROWN = 'nobu_champions_crown';
const HAT = 'nobu_wizard_hat';

// Unranked profile so gameplay params are on. The mock SDK's init reports ranked: true.
function own(relics, { ranked = false } = {}) {
  hub.profile = { playerId: 'player-1', ranked, relics: [...relics], effects: {} };
}

function loadoutWith(head, relics = ['tidebreaker_belt', 'tinubu_crown']) {
  own(relics);
  save.data.loadout = { slots: { head: null, neck: null, back: null, body: null } };
  const loadout = new Loadout();
  if (head) expect(loadout.equip('head', head)).toBe(true);
  return loadout;
}

// A Player without its model, scene or death props: just what jumping and biting read.
function stubPlayer(loadout) {
  const p = Object.create(Player.prototype);
  p.game = { loadout, fx: null, stage: {} };
  p.pos = new THREE.Vector3();
  p.vel = new THREE.Vector3();
  p.body = { grounded: true, ground: null, h: 1.3 };
  p.mode = 'normal';
  p.facing = 0; // forward is +z
  p.airJumps = 0;
  p.dashCharges = 0;
  p.airDashT = 0;
  p.bitten = new Set();
  p.prevY = 0;
  return p;
}

// Ground jump, then spend every air jump the player is allowed.
function jumpsInARow(p) {
  p.body.grounded = true;
  p._jump(TUNING.JUMP);
  let jumps = 1;
  while (p.canDouble && jumps < 10) {
    p._airJump();
    jumps += 1;
  }
  return jumps;
}

// A box whose near face is `nearZ` metres in front of Nobu, at bite height.
function target(nearZ) {
  const box = { min: { x: -0.2, y: 0.5, z: nearZ }, max: { x: 0.2, y: 1.0, z: nearZ + 0.4 } };
  return { interactive: true, dead: false, pos: { z: nearZ + 0.2 }, box, onBite: vi.fn() };
}

function biteAt(p, entity) {
  p.biteT = 0.3;
  p.bitten = new Set();
  p._interact({ entities: [entity] });
  return entity.onBite.mock.calls.length > 0;
}

beforeEach(() => {
  resetWorld();
  vi.spyOn(audio, 'play').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Champion's Crown catalog row", () => {
  it('is a head item unlocked by tidebreaker_belt, with the hub matrix effect ids', () => {
    const crown = itemById(CROWN);
    expect(crown).toMatchObject({ game: 'nobu', slot: 'head', name: "Champion's Crown", relic: 'tidebreaker_belt' });
    expect(itemEffects(crown)).toEqual([
      { id: 'extra_air_jumps', params: { count: 1 } },
      { id: 'bite_radius_mult', params: 1.4 },
    ]);
    // Single-effect rows still read through the same helper.
    expect(itemEffects(itemById(HAT)).map((fx) => fx.id)).toEqual(['spell_bark']);
    expect(NOBU_ITEMS.filter((item) => item.slot === 'head').map((item) => item.id)).toEqual([HAT, CROWN]);
  });
});

describe('ownership', () => {
  it('the Tidebreaker Belt from hub init unlocks the crown', async () => {
    sdk.relics.add('tidebreaker_belt');
    await readyHub();
    expect(hub.profile.relics).toContain('tidebreaker_belt');
    const owned = readNobuOwnership();
    expect(owned.ready).toBe(true);
    expect(owned.itemIds).toEqual([CROWN]);
    expect(new Loadout().options('head')).toEqual([null, CROWN]);
  });

  it('without the Belt the crown is not offered and cannot be equipped', () => {
    own(['tinubu_crown']);
    const loadout = new Loadout();
    expect(readNobuOwnership().itemIds).toEqual([HAT]);
    expect(loadout.options('head')).toEqual([null, HAT]);
    expect(loadout.equip('head', CROWN)).toBe(false);
    expect(loadout.slots.head).toBeNull();
  });

  it('a saved crown is cleared when the Belt is no longer owned', () => {
    loadoutWith(CROWN);
    own(['tinubu_crown']);
    const loadout = new Loadout();
    expect(loadout.slots.head).toBe(CROWN);
    expect(loadout.resync()).toEqual(["Champion's Crown"]);
    expect(loadout.slots.head).toBeNull();
  });

  it('the crown cannot go in another slot', () => {
    const loadout = loadoutWith(null);
    expect(loadout.equip('neck', CROWN)).toBe(false);
    expect(loadout.equip('body', CROWN)).toBe(false);
  });
});

describe('head slot: wizard hat or crown, never both', () => {
  it('offers both in catalog order once both relics are owned', () => {
    expect(loadoutWith(null).options('head')).toEqual([null, HAT, CROWN]);
  });

  it('equipping one replaces the other, and only its effects apply', () => {
    const loadout = loadoutWith(HAT);
    expect(loadout.effects.spell_bark).toBeTruthy();
    expect(loadout.effects.extra_air_jumps).toBeUndefined();

    expect(loadout.equip('head', CROWN)).toBe(true);
    expect(loadout.slots.head).toBe(CROWN);
    expect(loadout.cosmeticSlots().head).toBe(CROWN);
    expect(loadout.effects).toEqual({ extra_air_jumps: { count: 1 }, bite_radius_mult: 1.4 });
    expect(save.data.loadout.slots.head).toBe(CROWN);

    expect(loadout.equip('head', HAT)).toBe(true);
    expect(loadout.effects.extra_air_jumps).toBeUndefined();
    expect(loadout.effects.bite_radius_mult).toBeUndefined();
    expect(loadout.effects.spell_bark).toBeTruthy();
  });

  it('the crown stacks with a collar in the neck slot', () => {
    const loadout = loadoutWith(CROWN, ['tidebreaker_belt', 'hpos10i_core']);
    expect(loadout.equip('neck', 'nobu_clown_collar')).toBe(true);
    expect(Object.keys(loadout.effects).sort()).toEqual(['air_dash', 'bite_radius_mult', 'extra_air_jumps']);
  });

  it('Ranked keeps the crown mesh and drops its params', () => {
    const loadout = loadoutWith(CROWN);
    own(['tidebreaker_belt', 'tinubu_crown'], { ranked: true });
    expect(loadout.cosmeticSlots().head).toBe(CROWN);
    expect(loadout.effects).toEqual({});
  });

  it('dresses one head mesh at a time on the head socket', () => {
    const root = new THREE.Group();
    const headSocket = new THREE.Group();
    root.add(headSocket);
    const model = { root, headSocket, neckSocket: null, hatLift: 0.22, allMeshes: [] };

    const loadout = loadoutWith(HAT);
    dressNobuModel(model, loadout);
    expect(model.gearHat.userData.kind).toBe('hat');
    expect(headSocket.children).toHaveLength(1);

    loadout.equip('head', CROWN);
    dressNobuModel(model, loadout);
    expect(headSocket.children).toHaveLength(1);
    expect(headSocket.children[0]).toBe(model.gearHat);
    expect(model.gearHat.userData.kind).toBe('crown');
    expect(model.gearHat.position.y).toBeCloseTo(0.22);
    expect(model.gearHat.rotation.z).not.toBe(0); // tilted between the ears
    expect(model.allMeshes.every((mesh) => mesh.userData.nobuGear)).toBe(true);

    loadout.equip('head', null);
    dressNobuModel(model, loadout);
    expect(headSocket.children).toHaveLength(0);
    expect(model.gearHat).toBeNull();
    expect(model.allMeshes).toHaveLength(0);
  });

  it('mounts the GLB crown when loaded: keeps its height, sits a little higher, tilted', () => {
    // Stand-in for the normalized template Assets._loadModel builds (unit height, base at y = 0).
    const template = new THREE.Group();
    template.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.1), new THREE.MeshBasicMaterial()));
    Assets.models.set('model_nobu_champions_crown', template);
    try {
      const root = new THREE.Group();
      const headSocket = new THREE.Group();
      headSocket.scale.setScalar(0.5); // bone scale is divided out
      root.add(headSocket);
      const model = { root, headSocket, neckSocket: null, hatLift: 0.22, allMeshes: [] };
      dressNobuModel(model, loadoutWith(CROWN));
      const crown = model.gearHat;
      expect(crown.userData.kind).toBe('crown');
      expect(crown.children[0]).not.toBe(template.children[0]); // a clone, not the template
      expect(crown.scale.y).toBeCloseTo(CROWN_GLB.height / 0.5);
      expect(crown.position.y).toBeCloseTo((0.22 + CROWN_GLB.lift) / 0.5);
      expect(crown.rotation.z).not.toBe(0);
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(crown);
      expect(box.max.y - box.min.y).toBeGreaterThan(CROWN_GLB.height * 0.95); // tilt adds a little
      expect(box.max.y - box.min.y).toBeLessThan(CROWN_GLB.height * 1.4);
    } finally {
      Assets.models.delete('model_nobu_champions_crown');
    }
  });

  it('builds the procedural crown: gold band, five points, teal gems, pearl trim, front emblem', () => {
    const crown = buildChampionsCrown();
    const meshes = [];
    crown.traverse((obj) => { if (obj.isMesh) meshes.push(obj); });
    const byColor = (hex) => meshes.filter((m) => m.material.color.getHex() === hex);
    expect(meshes.filter((m) => m.geometry.type === 'ConeGeometry')).toHaveLength(5);
    expect(byColor(0x35d6c3).filter((m) => m.geometry.type === 'SphereGeometry')).toHaveLength(5);
    expect(byColor(0xfdf8ee).length).toBeGreaterThanOrEqual(16);
    const box = new THREE.Box3().setFromObject(crown);
    expect(box.min.y).toBeGreaterThan(-0.01);
    expect(box.max.y).toBeLessThan(0.25);
    // The wave medallion faces front (+z).
    const disc = meshes.find((m) => m.geometry.type === 'CylinderGeometry' && m.geometry.parameters.radiusTop < 0.05);
    expect(disc.position.z).toBeGreaterThan(0.15);
  });
});

describe('triple jump', () => {
  it('nothing on: ground jump + 1 air jump', () => {
    const p = stubPlayer(loadoutWith(null));
    expect(p.maxAirJumps).toBe(1);
    expect(jumpsInARow(p)).toBe(2);
  });

  it('crown on: ground jump + 2 air jumps', () => {
    const p = stubPlayer(loadoutWith(CROWN));
    expect(p.maxAirJumps).toBe(2);
    expect(jumpsInARow(p)).toBe(3);
  });

  it('the wizard hat does not add a jump', () => {
    const p = stubPlayer(loadoutWith(HAT));
    expect(jumpsInARow(p)).toBe(2);
  });

  it('walking off a ledge with the crown still leaves 2 air jumps', () => {
    const p = stubPlayer(loadoutWith(CROWN));
    p.canDouble = true;
    expect(p.airJumps).toBe(2);
  });

  it('Ranked: the crown is cosmetic, so a double jump only', () => {
    const loadout = loadoutWith(CROWN);
    own(['tidebreaker_belt'], { ranked: true });
    expect(jumpsInARow(stubPlayer(loadout))).toBe(2);
  });

  it('God mode keeps its 3 air jumps; the crown does not stack on it', () => {
    save.data.godMode = true;
    expect(jumpsInARow(stubPlayer(loadoutWith(null)))).toBe(4);
    expect(jumpsInARow(stubPlayer(loadoutWith(CROWN)))).toBe(4);
  });
});

describe('bite radius', () => {
  it('is TUNING.BITE_RANGE without the crown and 1.4x with it', () => {
    expect(stubPlayer(loadoutWith(null)).biteRange).toBeCloseTo(TUNING.BITE_RANGE);
    expect(stubPlayer(loadoutWith(HAT)).biteRange).toBeCloseTo(TUNING.BITE_RANGE);
    const crowned = stubPlayer(loadoutWith(CROWN));
    expect(crowned.biteMult).toBe(1.4);
    expect(crowned.biteRange).toBeCloseTo(TUNING.BITE_RANGE * 1.4);
  });

  it('a target just out of reach is bitten only with the crown on', () => {
    // Bite sphere centre is 0.75 m ahead. A box 1.9 m ahead is 1.15 m away:
    // past 0.95 m, inside 1.33 m.
    expect(biteAt(stubPlayer(loadoutWith(null)), target(1.9))).toBe(false);
    expect(biteAt(stubPlayer(loadoutWith(CROWN)), target(1.9))).toBe(true);
    // Both reach a close target; neither reaches one 2.2 m out (1.45 m from the centre).
    expect(biteAt(stubPlayer(loadoutWith(null)), target(1.2))).toBe(true);
    expect(biteAt(stubPlayer(loadoutWith(CROWN)), target(2.2))).toBe(false);
  });

  it('Ranked drops the wider bite', () => {
    const loadout = loadoutWith(CROWN);
    own(['tidebreaker_belt'], { ranked: true });
    const p = stubPlayer(loadout);
    expect(p.biteRange).toBeCloseTo(TUNING.BITE_RANGE);
    expect(biteAt(p, target(1.9))).toBe(false);
  });
});
