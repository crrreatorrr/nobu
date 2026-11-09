// Fixed Crash-style cameras: behind (levels 1 & 3), front-facing chase (level 2), arena framing for bosses,
// and a cinematic mode for intros/defeats. Exposes a camera-relative movement basis for the player.
import * as THREE from 'three';
import { damp, rand } from '../core/util.js';

const _v = new THREE.Vector3();

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
