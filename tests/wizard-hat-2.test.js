import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { save } from '../src/core/save.js';
import { itemById, itemEffects, itemMesh } from '../src/gear/catalog.js';
import { Loadout } from '../src/gear/loadout.js';
import { readNobuOwnership } from '../src/gear/ownership.js';
import { hub } from '../src/hub/hubBridge.js';
import { dressNobuModel } from '../src/player/accessories.js';
import { readyHub, resetWorld } from './helpers.js';
import { sdk } from './sdkState.js';

const HAT = 'nobu_wizard_hat';
const HAT2 = 'nobu_wizard_hat_2';
const CROWN = 'nobu_champions_crown';

function own(relics, { ranked = false } = {}) {
  hub.reach = 'ready';
  hub.inSession = true;
  hub.profile = { playerId: 'player-1', ranked, relics: [...relics], effects: {} };
}

beforeEach(() => {
  resetWorld();
  save.data.loadout = { slots: { head: null, neck: null, back: null, body: null } };
});

describe('Wizard Hat II catalog row', () => {
  it('is a head item unlocked by breakwater_coin with the Wizard Hat effect and mesh', () => {
    const hat2 = itemById(HAT2);
    expect(hat2).toMatchObject({ game: 'nobu', slot: 'head', name: 'Wizard Hat II', relic: 'breakwater_coin' });
    expect(itemEffects(hat2)).toEqual(itemEffects(itemById(HAT)));
    expect(itemEffects(hat2).map((fx) => fx.id)).toEqual(['spell_bark']);
    expect(hat2.cosmetic).toEqual(itemById(HAT).cosmetic);
    expect(itemMesh(HAT2)).toBe(HAT);
    expect(itemMesh(CROWN)).toBe(CROWN);
    expect(itemMesh(null)).toBeNull();
  });
});

describe('Wizard Hat II ownership', () => {
  it('the Breakwater Coin from hub init alone unlocks Wizard Hat II', async () => {
    sdk.relics.add('breakwater_coin');
    await readyHub();
    expect(hub.profile.relics).toEqual(['breakwater_coin']);
    expect(readNobuOwnership()).toMatchObject({ ready: true, itemIds: [HAT2] });
    const loadout = new Loadout();
    expect(loadout.options('head')).toEqual([null, HAT2]);
    expect(loadout.equip('head', HAT)).toBe(false);
  });

  it('Tinubu\'s Crown alone does not unlock Wizard Hat II', () => {
    own(['tinubu_crown']);
    const loadout = new Loadout();
    expect(loadout.options('head')).toEqual([null, HAT]);
    expect(loadout.equip('head', HAT2)).toBe(false);
  });

  it('offers None, Wizard Hat, Wizard Hat II, Champion\'s Crown when all are owned', () => {
    own(['tidebreaker_belt', 'breakwater_coin', 'tinubu_crown']);
    expect(new Loadout().options('head')).toEqual([null, HAT, HAT2, CROWN]);
  });

  it('equipping it gives Spell Bark; Ranked keeps the mesh and drops the params', () => {
    own(['breakwater_coin']);
    const loadout = new Loadout();
    expect(loadout.equip('head', HAT2)).toBe(true);
    expect(loadout.effects).toEqual({ spell_bark: itemById(HAT).effect.params });
    expect(loadout.effects.spell_bark.unlock_mega_bark).toBe(true);
    expect(save.data.loadout.slots.head).toBe(HAT2);
    expect(loadout.equip('neck', HAT2)).toBe(false);

    own(['breakwater_coin'], { ranked: true });
    expect(loadout.cosmeticSlots().head).toBe(HAT2);
    expect(loadout.effects).toEqual({});
  });

  it('a saved Wizard Hat II is hidden, not erased, while a session lacks the Coin', () => {
    own(['breakwater_coin']);
    new Loadout().equip('head', HAT2);
    own(['tinubu_crown']);
    const loadout = new Loadout();
    expect(loadout.resync()).toEqual(['Wizard Hat II']);
    expect(loadout.cosmeticSlots().head).toBeNull();
    expect(save.data.loadout.slots.head).toBe(HAT2);
  });

  it('dresses the same hat mesh as the Wizard Hat', () => {
    own(['breakwater_coin']);
    const loadout = new Loadout();
    loadout.equip('head', HAT2);
    const root = new THREE.Group();
    const headSocket = new THREE.Group();
    root.add(headSocket);
    const model = { root, headSocket, neckSocket: null, hatLift: 0.22, allMeshes: [] };
    dressNobuModel(model, loadout);
    expect(headSocket.children).toHaveLength(1);
    expect(model.gearHat.userData.kind).toBe('hat');
    expect(model.gearHat.position.y).toBeCloseTo(0.22);
  });
});
