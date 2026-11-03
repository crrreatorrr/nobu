import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { save } from '../src/core/save.js';
import { Loadout } from '../src/gear/loadout.js';
import { readNobuOwnership } from '../src/gear/ownership.js';
import { hub } from '../src/hub/hubBridge.js';
import { readyHub, resetHub, resetWorld } from './helpers.js';
import { sdk } from './sdkState.js';

const HAT = 'nobu_wizard_hat';

beforeEach(() => {
  resetWorld();
  save.data.loadout = { slots: { head: HAT, neck: null, back: null, body: null } };
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function standalone() {
  // Opened outside the hub, or the hub login failed: no session is cached.
  sessionStorage.clear();
  resetHub(hub);
  await hub.init();
}

describe('Relic gear ownership', () => {
  it('a live session that owns the relic shows and wears the Wizard Hat', async () => {
    sdk.relics.add('tinubu_crown');
    await readyHub();
    const loadout = new Loadout();
    expect(readNobuOwnership()).toMatchObject({ ready: true, itemIds: [HAT] });
    expect(loadout.options('head')).toEqual([null, HAT]);
    expect(loadout.cosmeticSlots().head).toBe(HAT);
  });

  it('a session with no hub link is "unknown" and keeps the saved hat', async () => {
    sdk.relics.add('tinubu_crown');
    await standalone();
    expect(hub.inSession).toBe(false);
    expect(readNobuOwnership().ready).toBe(false);
    const loadout = new Loadout();
    expect(loadout.resync()).toEqual([]);
    expect(save.data.loadout.slots.head).toBe(HAT);
  });

  it('a session whose relic list lacks the relic hides the hat but does not erase it', async () => {
    await readyHub();
    const loadout = new Loadout();
    expect(loadout.resync()).toEqual(['Wizard Hat']);
    expect(loadout.cosmeticSlots().head).toBe(null);
    expect(loadout.options('head')).toEqual([null]);
    expect(save.data.loadout.slots.head).toBe(HAT);

    // The next session that sees the relic wears it again, with no re-equip.
    sdk.relics.add('tinubu_crown');
    await readyHub();
    const next = new Loadout();
    expect(next.resync()).toEqual([]);
    expect(next.cosmeticSlots().head).toBe(HAT);
  });

  it('still clears an id that is not in the catalog', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    save.data.loadout = { slots: { head: 'retired_item', neck: null, back: null, body: null } };
    await readyHub();
    const loadout = new Loadout();
    loadout.resync();
    expect(save.data.loadout.slots.head).toBe(null);
  });
});
