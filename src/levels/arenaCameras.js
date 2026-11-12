// The five boss arenas' cameras, in one place so the framing tests use exactly what the game uses
// (tests/arena-framing.test.js, tests/boss-readability.test.js).
//
// Framing (plan B3, re-tuned after QA): a longer lens from further back, so the whole playable floor
// is in frame with Nobu at the centre or the near edge. `half` is the floor's half-width. With `fit`,
// the lens also widens when a threat would be out of frame (src/camera/camera.js, "Arena fit"). The
// Queen's camera pans far more (follow 0.4) and her arena is pillars from edge to edge, so it stays
// exactly as authored.
import * as THREE from 'three';

export const ARENA_CAMERAS = Object.freeze({
  bird: Object.freeze({ fov: 56, offset: Object.freeze({ x: 0, y: 13, z: 20 }), follow: 0.15, half: 12, fit: true }),
  cat: Object.freeze({ fov: 52, offset: Object.freeze({ x: 0, y: 13, z: 20 }), follow: 0.15, half: 12.5, fit: true }),
  cone: Object.freeze({ fov: 56, offset: Object.freeze({ x: 0, y: 13, z: 19.5 }), follow: 0.15, half: 12.5, fit: true }),
  titan: Object.freeze({ fov: 50, offset: Object.freeze({ x: 0, y: 13.5, z: 20.5 }), follow: 0.15, half: 13, fit: true }),
  queen: Object.freeze({ fov: 58, offset: Object.freeze({ x: 0, y: 15, z: 19 }), follow: 0.4, half: 11.7, fit: false }),
});

/** A fresh camera options object for one arena (the session adds the boss focus and the fit's collector). */
export function arenaCamera(key) {
  const a = ARENA_CAMERAS[key];
  const opts = { mode: 'arena', center: new THREE.Vector3(0, 0, 0), offset: { ...a.offset }, follow: a.follow };
  if (a.fit) opts.fit = { half: a.half };
  return opts;
}
