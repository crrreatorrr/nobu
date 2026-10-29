// Local equip slots. Ownership comes from readNobuOwnership(); this file only remembers the choice.
// Effects are derived per read and are never stored on the save. Ranked keeps the meshes and drops the params.

import { save } from '../core/save.js';
import { NOBU_ITEMS, SLOTS, itemById } from './catalog.js';
import { readNobuOwnership } from './ownership.js';

function emptySlots() {
  return { head: null, neck: null, back: null, body: null };
}

function readSlots(raw) {
  const slots = emptySlots();
  const src = raw && raw.slots && typeof raw.slots === 'object' ? raw.slots : {};
  for (const slot of SLOTS) {
    const id = src[slot];
    slots[slot] = typeof id === 'string' && id ? id : null;
  }
  return slots;
}

export class Loadout {
  constructor() {
    this.slots = readSlots(save.data.loadout);
  }

  get ranked() { return readNobuOwnership().ranked; }

  // Ids the wardrobe may offer, including None. Unowned items stay hidden.
  // Neck order follows the catalog: None, Golden Collar, Clown-Nose Collar.
  options(slot) {
    const own = readNobuOwnership();
    if (!own.ready) return [null];
    const owned = new Set(own.itemIds);
    const ids = NOBU_ITEMS.filter((item) => item.slot === slot && owned.has(item.id)).map((item) => item.id);
    return [null, ...ids];
  }

  // Meshes follow the equipped id even in Ranked. Gameplay params do not.
  cosmeticSlots() {
    const own = readNobuOwnership();
    const slots = emptySlots();
    if (!own.ready) return slots;
    const owned = new Set(own.itemIds);
    for (const slot of SLOTS) {
      const id = this.slots[slot];
      if (id && owned.has(id) && itemById(id)?.slot === slot) slots[slot] = id;
    }
    return slots;
  }

  get effects() {
    const own = readNobuOwnership();
    if (!own.ready || own.ranked) return {};
    const owned = new Set(own.itemIds);
    const out = {};
    for (const id of Object.values(this.slots)) {
      if (!id || !owned.has(id)) continue;
      const def = itemById(id);
      if (def?.effect) out[def.effect.id] = def.effect.params;
    }
    return out;
  }

  // Drop ids the server result does not own. Unknown ids are ignored, not crashed on.
  // Golden Collar and Clown-Nose Collar are both known neck ids, so neither is cleared as unknown.
  // Returns display names that were cleared, for one toast. Does not write other save fields.
  resync() {
    const own = readNobuOwnership();
    if (!own.ready) return [];
    const owned = new Set(own.itemIds);
    const lost = [];
    let changed = false;
    for (const slot of SLOTS) {
      const id = this.slots[slot];
      if (!id) continue;
      const def = itemById(id);
      if (!def) {
        console.warn('[wardrobe] unknown item', id);
        this.slots[slot] = null;
        changed = true;
        continue;
      }
      if (def.slot !== slot || !owned.has(id)) {
        lost.push(def.name);
        this.slots[slot] = null;
        changed = true;
      }
    }
    if (changed) this._persist();
    return lost;
  }

  // One id per slot. Assigning neck replaces the other collar.
  equip(slot, id) {
    if (!SLOTS.includes(slot)) return false;
    const next = id || null;
    if (next) {
      const own = readNobuOwnership();
      const def = itemById(next);
      if (!def || def.slot !== slot || !own.ready || own.itemIds.indexOf(next) === -1) return false;
    }
    if (this.slots[slot] === next) return false;
    this.slots[slot] = next;
    this._persist();
    return true;
  }

  _persist() {
    save.data.loadout = { slots: { ...this.slots } };
    save.write();
  }
}
