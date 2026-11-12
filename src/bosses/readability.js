// Boss-fight readability (docs/gameplay-improvement-plan.md, F1–F3 follow-up): threats and Nobu
// are drawn so they read from the far, whole-floor arena cameras. Everything here is presentation.
// It never changes a hit radius, a tell, a timer or what a boss does.
//
// The rule that makes it work at any camera distance: line widths are set in screen pixels, not
// world metres. A ring is sized each time it is drawn, from the camera that draws it.
import * as THREE from 'three';
import { canvasTex } from '../core/util.js';

export const READ = Object.freeze({
  refHeight: 540, // widths below are for a 540-pixel-high viewport and grow with it
  marker: Object.freeze({ px: 4.5, minPx: 3, minFrac: 0.08, maxFrac: 0.62 }), // gold landing ring
  shadow: Object.freeze({ px: 2.5, minPx: 2, minFrac: 0.1, maxFrac: 0.5 }), // ring under a flying projectile
  nobu: Object.freeze({ px: 3, minPx: 2.5, minFrac: 0.1, maxFrac: 0.75 }), // ring under Nobu
  gold: 0xffd23f, ink: 0x1a0a24, hot: 0xff3b1f,
  nobuColor: 0x7df9ff, nobuRadius: 0.7,
});

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _s = new THREE.Vector3();
const _centre = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _size = new THREE.Vector2();

/** Target ring width in pixels for a viewport `viewH` pixels high. */
export function ringPixels(viewH, cfg = READ.marker) {
  return Math.max(cfg.minPx, cfg.px * viewH / READ.refHeight);
}

/** Distance in pixels between two world points as `camera` draws them (matrices must be current). */
export function pixelsBetween(camera, viewH, p, q) {
  _a.copy(p).project(camera); _b.copy(q).project(camera);
  const hw = viewH * camera.aspect / 2, hh = viewH / 2;
  return Math.hypot((_a.x - _b.x) * hw, (_a.y - _b.y) * hh);
}

/**
 * World width a flat floor ring of world `radius` at `centre` needs for its band to be at least `px`
 * pixels wide all the way round. The thinnest part is the far side, where the band runs along the
 * view direction and is foreshortened, so that is where it is measured.
 */
export function ringWorldWidth(camera, viewH, centre, radius, px, cfg = READ.marker) {
  const lo = radius * cfg.minFrac, hi = radius * cfg.maxFrac;
  let gx = centre.x - camera.position.x, gz = centre.z - camera.position.z;
  const gl = Math.hypot(gx, gz);
  if (gl < 1e-4) { gx = 0; gz = -1; } else { gx /= gl; gz /= gl; }
  const far = _c.set(centre.x + gx * radius, centre.y, centre.z + gz * radius);
  let w = Math.min(hi, Math.max(lo, radius * 0.2));
  for (let i = 0; i < 3; i++) {
    const got = pixelsBetween(camera, viewH, far, _s.set(far.x - gx * w, far.y, far.z - gz * w));
    if (!(got > 1e-6)) return hi; // behind the camera or degenerate: as bold as allowed
    const next = Math.min(hi, Math.max(lo, w * px / got));
    if (Math.abs(next - w) < 1e-4) { w = next; break; }
    w = next;
  }
  return w;
}

/**
 * Fill strength of a marker that counts down, k running 0 → 1. It rises and beats faster as the
 * impact nears. There is no number or bar: like the egg bomb's blink, the beat is the tell.
 */
export function markerFill(k) {
  const t = Math.max(0, Math.min(1, k));
  const beat = 0.5 - 0.5 * Math.cos(Math.PI * 2 * (1.5 * t + 4.5 * t * t)); // about 1.5 beats early, six by the end
  return (0.1 + 0.34 * t) * (0.55 + 0.45 * beat);
}
/** Fill of a marker with no countdown of its own (it follows Nobu, then locks): a steady beat on the clock. */
export function steadyFill(seconds) { return 0.2 + 0.1 * Math.sin(seconds * 14); }

// ---------- the ring ----------
const RING_PAD = 1.12; // the quad is a little larger than the radius, for a dark hairline outside the band
const ringGeoXY = new THREE.PlaneGeometry(2 * RING_PAD, 2 * RING_PAD);
ringGeoXY.userData.shared = true;
const ringGeoFlat = new THREE.PlaneGeometry(2 * RING_PAD, 2 * RING_PAD).rotateX(-Math.PI / 2);
ringGeoFlat.userData.shared = true;

const RING_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// r is 1 at the hit radius. Outside it: a dark hairline. The band (uInner..1) is the ring colour, a
// dark line sits inside the band, and the rest is the fill, hotter toward the edge.
const RING_FRAG = /* glsl */`
uniform vec3 uColor; uniform vec3 uInk; uniform vec3 uFillColor;
uniform float uOpacity; uniform float uInner; uniform float uFill; uniform float uInkIn; uniform float uInkOut;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0 * ${RING_PAD.toFixed(2)};
  float aa = max(fwidth(r), 1e-4);
  float band = 1.0 - uInner;
  float edgeOut = 1.0 + band * uInkOut;
  float inside = 1.0 - smoothstep(edgeOut - aa, edgeOut, r);
  if (inside <= 0.0) discard;
  float lineIn = uInner - band * uInkIn;
  float gold = smoothstep(uInner - aa, uInner, r) * (1.0 - smoothstep(1.0 - aa, 1.0, r));
  float ink = max(smoothstep(lineIn - aa, lineIn, r) * (1.0 - smoothstep(uInner - aa, uInner, r)), smoothstep(1.0 - aa, 1.0, r));
  vec3 col = uFillColor; float a = uFill * (0.4 + 0.6 * r * r);
  col = mix(col, uInk, ink); a = mix(a, 0.8 * uOpacity, ink);
  col = mix(col, uColor, gold); a = mix(a, uOpacity, gold);
  gl_FragColor = vec4(col, a * inside);
  #include <colorspace_fragment>
}`;

function ringMaterial({ color, ink = READ.ink, fillColor = READ.hot, opacity = 1, inkIn = 0.45, inkOut = 0.3 }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uInk: { value: new THREE.Color(ink) }, uFillColor: { value: new THREE.Color(fillColor) },
      uOpacity: { value: opacity }, uInner: { value: 0.8 }, uFill: { value: 0 }, uInkIn: { value: inkIn }, uInkOut: { value: inkOut },
    },
    vertexShader: RING_VERT, fragmentShader: RING_FRAG,
    transparent: true, opacity, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2,
  });
}

/** Sizes one ring for the camera about to draw it. Exported for the tests; three calls it as onBeforeRender. */
export function sizeRing(ring, camera, viewH) {
  const u = ring.material.uniforms, d = ring.userData;
  const centre = ring.getWorldPosition(_centre);
  const world = d.radius * ring.getWorldScale(_scale).x;
  const w = world > 1e-5 ? ringWorldWidth(camera, viewH, centre, world, ringPixels(viewH, d.cfg), d.cfg) : 0;
  d.ringWorld = w;
  u.uInner.value = world > 1e-5 ? 1 - w / world : 0.8;
  u.uOpacity.value = ring.material.opacity;
  u.uFill.value = d.fill ?? 0;
  ring.material.uniformsNeedUpdate = true;
  return w;
}
function beforeRender(renderer, _scene, camera) {
  if (this.userData.clockFill) this.userData.fill = steadyFill(performance.now() / 1000);
  sizeRing(this, camera, renderer.getSize(_size).y);
}

/**
 * A flat ring whose band is a set number of pixels wide. `radius` is where its outer edge sits.
 * `flat` rings lie on the floor by themselves; the other kind is parented to a mesh that has already
 * been laid flat (a landing marker's shadow).
 */
export function makeGroundRing(radius, { cfg = READ.marker, flat = true, ...look } = {}) {
  const ring = new THREE.Mesh(flat ? ringGeoFlat : ringGeoXY, ringMaterial(look));
  ring.scale.setScalar(radius);
  ring.userData.radius = 1; // the geometry's own radius; the scale carries the size
  ring.userData.cfg = cfg;
  ring.userData.fill = 0;
  ring.onBeforeRender = beforeRender;
  ring.renderOrder = 3;
  return ring;
}

// ---------- outlines ----------
// An inverted hull: the same shape a little larger, back faces only, unlit and unfogged. It gives a
// projectile a hard edge against any floor, including a dark one.
const outlineMats = new Map();
export function outlineMaterial(color = READ.ink) {
  let m = outlineMats.get(color);
  if (!m) { outlineMats.set(color, m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, fog: false })); m.userData.shared = true; }
  return m;
}
/** Adds a hull made from `geometry` (already grown by the caller) to `mesh` and marks the mesh as outlined. */
export function addOutline(mesh, geometry, color = READ.ink) {
  const hull = new THREE.Mesh(geometry, outlineMaterial(color));
  hull.userData.outlineHull = true;
  mesh.add(hull);
  mesh.userData.outline = hull;
  return hull;
}

// ---------- shadow under a projectile ----------
let shadowMat;
/**
 * Where a thing in the air is over the floor: a dark disc with a pale edge, the size of its hit
 * radius. Every shadow shares one material; each ring's band is set as that ring is drawn.
 */
export function makeGroundShadow(radius) {
  shadowMat ||= ringMaterial({ color: 0xfff4d6, fillColor: 0x000000, opacity: 0.9, inkIn: 0, inkOut: 0.5 });
  const ring = new THREE.Mesh(ringGeoFlat, shadowMat);
  ring.scale.setScalar(radius);
  ring.userData.radius = 1;
  ring.userData.cfg = READ.shadow;
  ring.userData.fill = 0.5;
  ring.userData.groundShadowRing = true;
  ring.onBeforeRender = beforeRender;
  ring.renderOrder = 2;
  return ring;
}

// ---------- lanes ----------
let laneTex;
/**
 * A dash or charge lane: a see-through strip with a solid bright line and a dark line down each
 * side, so its edges read on any floor. Use it as the `map` of a plane whose u runs across the lane.
 */
export function laneTexture() {
  laneTex ||= canvasTex(64, 4, (g) => {
    g.clearRect(0, 0, 64, 4);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(0, 0, 64, 4);
    g.fillStyle = 'rgba(255,255,255,1)'; g.fillRect(2, 0, 5, 4); g.fillRect(57, 0, 5, 4);
    g.fillStyle = 'rgba(26,10,36,1)'; g.fillRect(0, 0, 2, 4); g.fillRect(62, 0, 2, 4); g.fillRect(7, 0, 1, 4); g.fillRect(56, 0, 1, 4);
  });
  return laneTex;
}
/** Gives an existing lane mesh the edged look. Its opacity and colour stay under the caller's control. */
export function styleLane(lane) {
  lane.material.map = laneTexture();
  lane.material.fog = false;
  lane.material.needsUpdate = true;
  lane.userData.edged = true;
  return lane;
}

const pathGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
pathGeo.userData.shared = true;
/** A lane from one floor point to another, for a sweep whose path is known before it starts (setFloorPath aims it). */
export function makeFloorPath(color) {
  const path = styleLane(new THREE.Mesh(pathGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false })));
  path.visible = false;
  path.renderOrder = 2;
  path.userData.floorPath = true;
  return path;
}
export function setFloorPath(path, from, to, width, opacity) {
  const dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz);
  path.visible = len > 0.05;
  path.position.set(from.x, from.y + 0.04, from.z);
  path.rotation.y = Math.atan2(dx, dz);
  path.scale.set(width, 1, Math.max(len, 0.001));
  path.material.opacity = opacity;
}

// ---------- Nobu ----------
/** A cyan ring on the floor under Nobu. It stays on the floor while he jumps, so it also shows where he lands. */
export function makeNobuRing() {
  const ring = makeGroundRing(READ.nobuRadius, { cfg: READ.nobu, color: READ.nobuColor, fillColor: READ.nobuColor, opacity: 0.95, inkIn: 0.5, inkOut: 0.5 });
  ring.name = 'nobu-ring';
  ring.userData.fill = 0.12;
  ring.visible = false;
  return ring;
}
/** Puts the ring on the floor under Nobu, or hides it over a pit, while dead or outside a fight. */
export function placeNobuRing(ring, world, player, on) {
  const gy = on && !player.dead ? world.groundBelow(player.pos.x, player.pos.y + 0.1, player.pos.z) : -Infinity;
  if (gy === -Infinity) { ring.visible = false; return; }
  ring.visible = true;
  ring.position.set(player.pos.x, gy + 0.045, player.pos.z);
}
