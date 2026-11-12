// What a boss fight must keep readable: the world points of Nobu, the boss and every active threat.
// The arena camera widens its lens to keep these points in frame (src/camera/camera.js), the playtest harness checks
// them against the frame (tools/playtest.mjs, suite `attacks`), and tests/arena-framing.test.js
// proves the fit. Presentation only: nothing here feeds boss logic.
import * as THREE from 'three';

const _c = new THREE.Vector3();
const _s = new THREE.Vector3();
const _box = new THREE.Box3();

/** A reusable flat list of world points, each tagged with the kind of thing it belongs to. */
export class PointSet {
  constructor() { this.xyz = []; this.kinds = []; this.n = 0; }
  clear() { this.n = 0; return this; }
  add(x, y, z, kind = 'threat') {
    const i = this.n * 3;
    this.xyz[i] = x; this.xyz[i + 1] = y; this.xyz[i + 2] = z;
    this.kinds[this.n++] = kind;
    return this;
  }
}

/** How far around Nobu the camera keeps the floor in view, so the next step is never off screen. */
export const NOBU_REACH = 2.5;
const NOBU_HEIGHT = 1.4;

/** True for a landing marker made by makeMarker() that is being drawn. */
export function isActiveMarker(o) {
  return !!o.userData.rim && o.visible && (o.material.opacity > 0.01 || o.userData.rim.material.opacity > 0.01);
}

/** The four floor points at the edge of a marker's hit radius, plus its centre. */
function addMarker(out, marker) {
  marker.getWorldPosition(_c);
  const r = marker.userData.radius ?? marker.geometry.parameters.width / 2;
  // The rim is kept at the true hit radius even while the shadow under it grows or pulses.
  const rim = marker.userData.rim;
  const reach = r * (rim.userData.trueSize ? 1 : marker.getWorldScale(_s).x);
  out.add(_c.x, _c.y, _c.z, 'marker');
  out.add(_c.x - reach, _c.y, _c.z, 'marker'); out.add(_c.x + reach, _c.y, _c.z, 'marker');
  out.add(_c.x, _c.y, _c.z - reach, 'marker'); out.add(_c.x, _c.y, _c.z + reach, 'marker');
}

// The middle of a lane's far end (the wall a charge will hit). A lane runs along its local +z, so its
// far end is the bounding box's max z.
function addLaneEnd(out, mesh) {
  const b = mesh.geometry.boundingBox;
  _c.set((b.min.x + b.max.x) / 2, b.max.y, b.max.z).applyMatrix4(mesh.matrixWorld);
  out.add(_c.x, _c.y, _c.z, 'laneEnd');
}

function addBoxCorners(out, mesh, kind) {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  mesh.updateWorldMatrix(true, false);
  _box.copy(mesh.geometry.boundingBox);
  for (const x of [_box.min.x, _box.max.x]) for (const z of [_box.min.z, _box.max.z]) {
    _c.set(x, _box.max.y, z).applyMatrix4(mesh.matrixWorld);
    out.add(_c.x, _c.y, _c.z, kind);
  }
}

/**
 * Collects the points into `out` (a PointSet) and returns it.
 * `fight` is { player, boss, projectiles, scene }; any part may be missing.
 */
export function collectThreats(fight, out = new PointSet()) {
  out.clear();
  const { player, boss, projectiles, scene } = fight;
  if (player?.pos) {
    const p = player.pos;
    out.add(p.x, p.y, p.z, 'nobu'); out.add(p.x, p.y + NOBU_HEIGHT, p.z, 'nobu');
    const gy = player.body?.grounded ? p.y : Math.min(p.y, fight.groundY ?? p.y);
    out.add(p.x - NOBU_REACH, gy, p.z, 'reach'); out.add(p.x + NOBU_REACH, gy, p.z, 'reach');
    out.add(p.x, gy, p.z - NOBU_REACH, 'reach'); out.add(p.x, gy, p.z + NOBU_REACH, 'reach');
  }
  if (boss?.pos && !boss.defeated) {
    const b = boss.pos, h = boss.size?.h ?? 2.5, oy = boss.size?.oy ?? 0;
    out.add(b.x, b.y + oy, b.z, 'boss'); out.add(b.x, b.y + oy + h, b.z, 'boss');
    for (const name of ['lane', 'laserPath']) {
      const lane = boss[name];
      if (!lane?.isMesh || !lane.visible || !lane.parent) continue;
      addBoxCorners(out, lane, 'lane');
      // A charge lane's end is framed while the lane is shown, even if that widens the lens.
      if (name === 'lane') addLaneEnd(out, lane);
    }
    for (const beam of [...(boss.beams || []), boss.beam, boss.arena?.beam]) {
      if (!beam) continue;
      if (beam.group?.visible) out.add(beam.to.x, beam.to.y, beam.to.z, 'beam');
    }
    for (const list of [boss.minions, boss.drones, boss.decoys]) {
      for (const m of list || []) {
        if (m.dead || m.alive === false || m.visible === false || !m.pos) continue;
        if (m.group && !m.group.visible) continue; // a decoy that is not on the field
        out.add(m.pos.x, m.pos.y, m.pos.z, 'minion');
      }
    }
  }
  for (const pr of projectiles?.list || []) {
    const m = pr.mesh.position;
    if (pr.kind === 'drop') continue; // its marker is the threat; the object itself starts 14 m up
    if (pr.kind === 'wave') continue; // a ring that grows to fill the arena; the part that matters is at Nobu
    if (pr.kind === 'scratch') { out.add(pr.a.x, pr.a.y, pr.a.z, 'projectile'); out.add(pr.b.x, pr.b.y, pr.b.z, 'projectile'); continue; }
    if (pr.kind === 'cable') {
      out.add(pr.pivot.x, pr.groundY, pr.pivot.z, 'projectile');
      out.add(2 * m.x - pr.pivot.x, pr.groundY, 2 * m.z - pr.pivot.z, 'projectile');
      continue;
    }
    if (pr.mesh.visible) out.add(m.x, m.y, m.z, 'projectile');
  }
  for (const o of scene?.children || []) if (o.userData.rim && isActiveMarker(o)) addMarker(out, o);
  return out;
}
