// Fixed Crash-style cameras: behind (levels 1 & 3), front-facing chase (level 2), arena framing for bosses,
// and a cinematic mode for intros/defeats. Exposes a camera-relative movement basis for the player.
import * as THREE from 'three';
import { damp, rand } from '../core/util.js';
import { PointSet } from '../bosses/threats.js';

const _v = new THREE.Vector3();
const _fitSet = new PointSet();

// Arena fit (boss fights). The authored arena cameras show the whole floor when Nobu is at the centre
// or the near edge, but they pan with him, so a threat on the far side of him can be out of frame, and
// a boss that rears up high is cut off at the top. With `opts.fit` set, the lens widens, at once and
// only as far as needed (down to minZoom), the moment Nobu, the boss or an active threat would not be
// inside the frame, and eases back when they are. It never goes tighter than the authored lens, so it
// never hides floor the authored camera shows. (A version that also tightened toward the action made
// Nobu 1.2x taller but hid 1.2 to 3.3 m more of the near floor; see the plan's status section.)
// Only the field of view changes; the camera's position and aim, and so the movement basis, are
// exactly the authored ones.
//   opts.fit = { half, halfZ?, baseFov?, collect(pointSet) }
// `half` is the floor's half-width (and half-depth unless halfZ is given) around opts.center.
// collect() adds the points to frame (src/bosses/threats.js).
export const ARENA_FIT = Object.freeze({
  margin: 0.9, // Nobu, markers, projectiles and lanes stay inside this fraction of the frame
  reachMargin: 0.97, // the floor around Nobu
  bossMargin: 0.97, // the boss, whose top is high in the frame when it flies
  maxIn: 1, // never tighter than the authored lens: tightening hides floor
  minZoom: 0.82, // never wider than this times the authored lens
  inRate: 0.1, // easing back per second, as a fraction of the authored lens; widening is immediate
  cineRate: 3, // ease back to the authored lens during a cinematic
});
const FIT_MARGIN = { reach: ARENA_FIT.reachMargin, boss: ARENA_FIT.bossMargin };
// Kept in frame while that costs nothing, but never a reason to go wider than the authored lens: the
// floor around Nobu, and the corners of a lane. The middle of a charge lane's far end (kind 'laneEnd',
// the wall the Titan or the Cat will hit) is not soft: the lens widens for it while the lane is shown.
const FIT_SOFT = { reach: true, lane: true };

/**
 * The smallest tan(fov / 2) at which every point is inside the frame of `cam` as it stands, each with
 * its margin. Points behind the camera cannot be framed and are skipped. `cam.matrixWorldInverse`
 * must be current. Soft points (see FIT_SOFT) ask for no more than `softCap`.
 */
export function requiredTan(cam, set, softCap = Infinity) {
  let need = 0;
  const e = cam.matrixWorldInverse.elements, a = cam.aspect, xyz = set.xyz;
  for (let i = 0; i < set.n; i++) {
    const x = xyz[i * 3], y = xyz[i * 3 + 1], z = xyz[i * 3 + 2];
    const depth = -(e[2] * x + e[6] * y + e[10] * z + e[14]);
    if (depth < 0.5) continue;
    const cx = Math.abs(e[0] * x + e[4] * y + e[8] * z + e[12]), cy = Math.abs(e[1] * x + e[5] * y + e[9] * z + e[13]);
    const m = FIT_MARGIN[set.kinds[i]] ?? ARENA_FIT.margin;
    let t = Math.max(cy, cx / a) / (depth * m);
    if (t > softCap && FIT_SOFT[set.kinds[i]]) t = softCap;
    if (t > need) need = t;
  }
  return need;
}

/** Fills `set` with what an arena fit must frame, each point pulled in to the edge of the floor. */
export function fitPoints(opts, set) {
  const fit = opts.fit, c = opts.center, cx = c?.x ?? 0, cz = c?.z ?? 0;
  const hx = fit.half ?? Infinity, hz = fit.halfZ ?? hx;
  set.clear();
  fit.collect?.(set);
  // A marker or a lane may run past the edge of the floor; only the part on the floor has to show.
  for (let i = 0; i < set.n; i++) {
    set.xyz[i * 3] = Math.min(cx + hx, Math.max(cx - hx, set.xyz[i * 3]));
    set.xyz[i * 3 + 2] = Math.min(cz + hz, Math.max(cz - hz, set.xyz[i * 3 + 2]));
  }
  return set;
}

// Right-stick camera peek. The authored framing stays in charge: the stick swings the camera
// around its look point by at most these angles (radians) and it eases back when released.
// Movement keeps using the authored framing, so a peek never changes which way Up goes.
export const PEEK = {
  yaw: 0.5, // stick fully left/right
  up: 0.15, // stick fully up lowers the camera to look up
  down: 0.3, // stick fully down raises it to look down
  response: 8, // per second; frame-rate independent easing toward the stick position
  minElevation: 0.05, maxElevation: 1.3, // camera stays above the look point, short of overhead
};

/** Ease the peek angles toward the stick ([x right, y down], already deadzoned). */
export function stepPeek(peek, stick, dt, cfg = PEEK) {
  const x = stick?.[0] || 0, y = stick?.[1] || 0;
  const k = 1 - Math.exp(-cfg.response * Math.max(0, dt));
  peek.yaw += (x * cfg.yaw - peek.yaw) * k;
  peek.pitch += ((y > 0 ? y * cfg.down : y * cfg.up) - peek.pitch) * k;
  if (Math.abs(peek.yaw) < 1e-4 && !x) peek.yaw = 0;
  if (Math.abs(peek.pitch) < 1e-4 && !y) peek.pitch = 0;
  return peek;
}

export class GameCamera {
  constructor(aspect) {
    this.cam = new THREE.PerspectiveCamera(58, aspect, 0.1, 800);
    this.mode = 'behind';
    this.opts = {};
    this.pos = new THREE.Vector3(0, 5, 10);
    this.look = new THREE.Vector3();
    this.trackY = 0;
    this.trackX = 0;
    this.shakeT = 0;
    this.shakeDur = 0.0001;
    this.shakeAmp = 0;
    this.basis = { forward: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0), toCamera: 0 };
    this.cine = null;
    this.sideAxis = false;
    this.switchT = 0;
    this.peekInput = [0, 0]; // set each play frame from the right stick
    this.peek = { yaw: 0, pitch: 0 };
    this._fit = null; // arena fit state: { opts, base, tan }
  }

  /** How wide the arena fit is right now: 1 is the authored lens, below 1 is wider. */
  get fitZoom() { return this._fit ? this._fit.base / this._fit.tan : 1; }

  // Runs last, on the camera as it will be drawn (after shake and peek).
  _fitLens(dt, player, snap = false) {
    const o = this.opts, cam = this.cam, fit = this.mode === 'arena' ? o.fit : null;
    if (!fit?.collect) { this._fit = null; return; }
    let st = this._fit;
    if (!st || st.opts !== o) {
      // The authored lens: the session records it on the fit when it sets the arena's field of view.
      const t = Math.tan((fit.baseFov ?? cam.fov) * Math.PI / 360);
      st = this._fit = { opts: o, base: t, tan: t };
    }
    if (this.cine || !player) {
      st.tan = snap ? st.base : damp(st.tan, st.base, ARENA_FIT.cineRate, dt);
    } else {
      cam.updateMatrixWorld();
      const set = fitPoints(o, _fitSet);
      const lo = st.base / ARENA_FIT.maxIn, hi = st.base / ARENA_FIT.minZoom;
      const want = Math.min(hi, Math.max(lo, requiredTan(cam, set, st.base)));
      // Never tighter than needed, even for one frame; easing back is slow so the lens does not pump.
      st.tan = snap || want >= st.tan ? want : Math.max(want, st.tan - ARENA_FIT.inRate * st.base * dt);
    }
    const fov = Math.atan(st.tan) * 360 / Math.PI;
    if (Math.abs(fov - cam.fov) > 1e-4) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }

  setMode(mode, opts = {}, blend = 0.6) {
    if (this.mode !== mode || this.opts !== opts) this.switchT = blend;
    this.sideAxis = mode === 'side';
    this.mode = mode;
    this.opts = opts;
  }

  // Cinematic shot: fixed position/look, eased in.
  cinematic(pos, look, speed = 3) {
    this.cine = { pos: pos.clone(), look: look.clone(), speed };
  }
  endCinematic() { this.cine = null; }

  shake(amp, dur = 0.3) {
    if (amp >= this.shakeAmp * (this.shakeT / this.shakeDur)) {
      this.shakeAmp = amp; this.shakeT = dur; this.shakeDur = dur;
    }
  }

  // Backstop metadata is additive: ordinary terrain and every non-track camera
  // keep their existing framing. Leave the near plane in front of the stop.
  _backstopS(player, requested) {
    const tr = this.opts.track, sp = player.body.s ?? 0;
    if (!tr || !['track', 'rise', 'trackFront'].includes(this.mode)) return requested;
    const margin = this.cam.near + .1, front = this.mode === 'trackFront';
    let safe = requested;
    for (const span of tr.spans || []) {
      if (!span.cameraBackstop || span.disabled) continue;
      if (front && span.d0 >= sp) safe = Math.min(safe, span.d0 - margin);
      else if (!front && span.d1 <= sp) safe = Math.max(safe, span.d1 + margin);
    }
    return safe;
  }

  _constrainBackstop(player, position) {
    const tr = this.opts.track;
    if (!tr || !['track', 'rise', 'trackFront'].includes(this.mode)) return;
    const projection = tr.project(position.x, position.z);
    const safe = this._backstopS(player, projection.s);
    if (safe === projection.s) return;
    const height = position.y;
    tr.toWorld(safe, projection.u, 0, position);
    position.y = height;
  }

  _targets(player, out) {
    out.backstopClamped = false;
    out.minBackstopY = null;
    const p = player.pos;
    const o = this.opts;
    if (Number.isFinite(o.holdY)) this.trackY = o.holdY;
    else if (this.mode === 'rise') this.trackY = p.y - 0.5;
    else if (player.body.grounded || p.y < this.trackY) this.trackY = p.y;
    else if (p.y > this.trackY + 2.4) this.trackY = p.y - 2.4;
    const ty = this.trackY;
    if ((this.mode === 'track' || this.mode === 'trackFront' || this.mode === 'side' || this.mode === 'rise') && o.track) {
      const tr = o.track;
      const sp = player.body.s ?? 0, u = player.body.u ?? 0;
      let framing = 1;
      // keep the camera above the path itself (hills behind / ahead)
      if (this.mode === 'side') {
        tr.toWorld(sp + (o.ahead ?? 2.5), (o.side ?? 1) * (o.dist ?? 13), 0, out.pos);
        out.pos.y = ty + (o.height ?? 4.5);
        tr.toWorld(sp + (o.ahead ?? 2.5), 0, 0, out.look); out.look.y = ty + 1;
      } else if (this.mode === 'track' || this.mode === 'rise') {
        const distance = o.dist ?? (this.mode === 'rise' ? 9.5 : 8.6);
        const desired = sp - distance, cs = this._backstopS(player, desired);
        out.backstopClamped = cs !== desired;
        framing = cs === desired ? 1 : Math.max(0, Math.min(1, (sp - cs) / distance));
        tr.toWorld(cs, u * (1 - .45 * framing), 0, out.pos);
        out.pos.y = Math.max(ty + (o.height ?? 4.3), tr.heightAt(cs) + 2.2);
        tr.toWorld(sp + (o.ahead ?? 5.5) * framing, u * (1 - .2 * framing), 0, out.look);
        out.look.y = ty + 1.15;
        if (this.mode === 'rise') { out.pos.y = ty + (o.height ?? 2.2); out.look.y += (o.lookUp ?? 3) * framing * framing; }
      } else {
        const distance = o.dist ?? 12.5;
        const desired = sp + distance, cs = this._backstopS(player, desired);
        out.backstopClamped = cs !== desired;
        framing = cs === desired ? 1 : Math.max(0, Math.min(1, (cs - sp) / distance));
        tr.toWorld(cs, u * (1 - .5 * framing), 0, out.pos);
        out.pos.y = Math.max(ty + (o.height ?? 6.6), tr.heightAt(cs) + 3);
        tr.toWorld(sp - (o.behind ?? 0.5) * framing, u * (1 - .3 * framing), 0, out.look);
        out.look.y = ty + 1.0;
      }
      if (out.backstopClamped) {
        // A low rise camera can be almost overhead at a stop. Keep the body's
        // width inside even the narrow viewport's horizontal field of view.
        const aperture = Math.tan(this.cam.fov * Math.PI / 360) * Math.min(1, this.cam.aspect);
        const radius = Math.max(player.body.hw ?? .3, player.body.hd ?? .3, .36);
        out.minBackstopY = p.y + ((player.body.h ?? 1.3) + radius / aperture + .15) * (1 - framing);
        out.pos.y = Math.max(out.pos.y, out.minBackstopY);
      }
      return;
    }
    if (this.mode === 'behind') {
      const cx = (o.centerX ?? 0) * 0.35 + p.x * 0.65;
      out.pos.set(cx, ty + (o.height ?? 4.4), p.z + (o.dist ?? 8.4));
      out.look.set(p.x * 0.85 + (o.centerX ?? 0) * 0.15, ty + 1.2, p.z - (o.ahead ?? 5));
    } else if (this.mode === 'front') {
      out.pos.set(p.x * 0.55, ty + (o.height ?? 5.6), p.z - (o.dist ?? 9.8));
      out.look.set(p.x * 0.7, ty + 1.0, p.z + (o.behind ?? 2.5));
    } else if (this.mode === 'arena') {
      const c = o.center || _v.set(0, 0, 0);
      const k = o.follow ?? 0.45;
      const fx = c.x + (p.x - c.x) * k, fz = c.z + (p.z - c.z) * k;
      const off = o.offset || { x: 0, y: 10, z: 15 };
      out.pos.set(fx + off.x, (o.baseY ?? 0) + off.y + Math.max(0, p.y - (o.baseY ?? 0)) * 0.4, fz + off.z);
      out.look.set(c.x + (p.x - c.x) * 0.6, (o.baseY ?? 0) + 1.2 + Math.max(0, p.y - (o.baseY ?? 0)) * 0.5, c.z + (p.z - c.z) * 0.6);
      if (o.focus) {
        const f = o.focus;
        out.look.lerp(f, o.focusWeight ?? 0.25);
      }
    }
  }

  snap(player) {
    this.peek.yaw = 0; this.peek.pitch = 0;
    const t = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this.trackY = player.pos.y;
    this._targets(player, t);
    this.pos.copy(t.pos);
    this.look.copy(t.look);
    this._apply(0, player);
    this._fitLens(0, player, true);
  }

  update(dt, player) {
    const t = this._t || (this._t = { pos: new THREE.Vector3(), look: new THREE.Vector3() });
    if (this.cine) {
      t.pos.copy(this.cine.pos); t.look.copy(this.cine.look);
      const k = this.cine.speed;
      this.pos.x = damp(this.pos.x, t.pos.x, k, dt); this.pos.y = damp(this.pos.y, t.pos.y, k, dt); this.pos.z = damp(this.pos.z, t.pos.z, k, dt);
      this.look.x = damp(this.look.x, t.look.x, k, dt); this.look.y = damp(this.look.y, t.look.y, k, dt); this.look.z = damp(this.look.z, t.look.z, k, dt);
    } else if (player) {
      this._targets(player, t);
      const k = this.mode === 'arena' || this.switchT > 0 ? 4 : 7;
      this.switchT = Math.max(0, this.switchT - dt);
      this.pos.x = damp(this.pos.x, t.pos.x, k, dt);
      this.pos.y = damp(this.pos.y, t.pos.y, 4.5, dt);
      if (t.minBackstopY !== null) this.pos.y = Math.max(this.pos.y, t.minBackstopY);
      this.pos.z = damp(this.pos.z, t.pos.z, k, dt);
      if (t.backstopClamped) {
        // At the wall a stale, eased lookahead can look past the nearby player.
        this.look.copy(t.look);
      } else {
        this.look.x = damp(this.look.x, t.look.x, k + 3, dt);
        this.look.y = damp(this.look.y, t.look.y, 6, dt);
        this.look.z = damp(this.look.z, t.look.z, k + 3, dt);
      }
    }
    this._apply(dt, player);
    if (player) {
      const f = this.basis.forward.set(this.look.x - this.pos.x, 0, this.look.z - this.pos.z).normalize();
      this.basis.right.set(-f.z, 0, f.x);
      if (this.sideAxis && this.opts.track) {
        this.opts.track.tangent(player.body.s ?? 0, this.basis.right);
        this.opts.track.right(player.body.s ?? 0, this.basis.forward).multiplyScalar(-(this.opts.side ?? 1));
      }
      this.basis.toCamera = Math.atan2(this.cam.position.x - player.pos.x, this.cam.position.z - player.pos.z);
    }
    stepPeek(this.peek, this.cine || !player ? null : this.peekInput, dt);
    this._applyPeek(player);
    this._fitLens(dt, player);
  }

  // Swing the rendered camera around the look point. Runs after the movement basis is taken.
  _applyPeek(player) {
    const { yaw, pitch } = this.peek;
    if (!yaw && !pitch) return;
    const p = this.cam.position, o = _v.subVectors(p, this.look);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const ox = o.x * c - o.z * s, oz = o.z * c + o.x * s; // yaw > 0 turns the view right
    const flat = Math.hypot(ox, oz), dist = Math.hypot(flat, o.y);
    if (flat < 1e-6) return;
    const base = Math.atan2(o.y, flat); // never clamp the authored angle itself, only the peek
    const elev = Math.min(Math.max(base, PEEK.maxElevation), Math.max(Math.min(base, PEEK.minElevation), base + pitch));
    const h = Math.cos(elev) * dist / flat;
    p.set(this.look.x + ox * h, this.look.y + Math.sin(elev) * dist, this.look.z + oz * h);
    if (player && !this.cine) this._constrainBackstop(player, p);
    this.cam.lookAt(this.look);
  }

  _apply(dt, player) {
    if (player && !this.cine) this._constrainBackstop(player, this.pos);
    this.cam.position.copy(this.pos);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmp * Math.max(0, this.shakeT / this.shakeDur);
      this.cam.position.x += rand(-a, a);
      this.cam.position.y += rand(-a, a);
      this.cam.position.z += rand(-a, a) * 0.5;
      if (player && !this.cine) this._constrainBackstop(player, this.cam.position);
    }
    this.cam.lookAt(this.look);
  }
}
