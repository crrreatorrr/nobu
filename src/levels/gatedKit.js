import * as THREE from 'three';
import { Backpack } from '../entities/breakables.js';
import { DustWall, MoonLedge, SmogVent, ZoomieGate, PitySnacks } from '../entities/gatedObjects.js';
import { MysteryBackpack } from '../entities/mysteryBackpack.js';

// One canonical section representation. Legacy consumers may request tuples explicitly.
export const sectionTuples = (sections) => sections.map(({ d0, d1, name }) => [d0, d1, name]);

export function addGatedHelpers(k, game, stage, track = k.track) {
  const at = (Cls, x, y, d, opts) => {
    const p = k.W(x, y, d);
    return stage.add(new Cls(stage, p.x, p.y, p.z, { ...opts, yaw: k.yawAt(d) }));
  };
  return Object.assign(k, {
    section(d0, d1, name, options = {}) {
      if (!track || !Number.isFinite(d0) || !Number.isFinite(d1) || d1 <= d0 || !/^[A-Z][\w'-]*(?: [A-Z][\w'-]*){0,2}$/.test(name)) throw new Error('Invalid section');
      const flags = options.detour || track.detour ? { detour: true } : {};
      track.sections ??= [];
      let section;
      if (typeof track.section === 'function') section = track.section(d0, d1, name, flags);
      else {
        section = { d0, d1, name, ...flags };
        track.sections.push(section); track.sections.sort((a, b) => a.d0 - b.d0);
      }
      stage.sections = track.sections;
      return section;
    },
    pitySnacks: (x, y, d) => at(PitySnacks, x, y, d),
    mystery(x, y, d, options = {}) {
      stage.mysterySlots ??= new Set();
      let slot = options.slot;
      if (slot === undefined) { slot = 0; while (stage.mysterySlots.has(slot)) slot++; }
      if (!Number.isInteger(slot) || slot < 0 || slot > 2 || stage.mysterySlots.has(slot)) throw new Error('Mystery slots must be unique integers 0–2 per level');
      stage.mysterySlots.add(slot);
      return at(game.session.trial || game.session.remix ? Backpack : MysteryBackpack, x, y, d, { ...options, slot });
    },
    dustWall: (x, y, d, opts) => at(DustWall, x, y, d, opts),
    moonLedge: (x, y, d, opts) => at(MoonLedge, x, y, d, opts),
    smogVent: (x, y, d, opts) => at(SmogVent, x, y, d, opts),
    zoomieGate(x, y, d, opts = {}) {
      const plateD = opts.plateD ?? d - 22;
      return at(ZoomieGate, x, y, d, { ...opts, plateD, u: x, platePos: k.W(x, y, plateD) });
    },
    // Convert an authored rectangular secret area through W, including curved/mirrored tracks.
    gatedArea(x0, x1, y0, y1, d0, d1) {
      const box = new THREE.Box3();
      for (let d = d0; d < d1; d += 0.5) for (const x of [x0, x1]) for (const y of [y0, y1]) box.expandByPoint(k.W(x, y, d));
      for (const x of [x0, x1]) for (const y of [y0, y1]) box.expandByPoint(k.W(x, y, d1));
      return box;
    },
  });
}
