// Shared switch crate: a rounded box with dark trim along every edge and a glowing emblem on the four sides
// and the top. Green "!" for the rug switches (Lint Roller, Vacuum Dock), blue bone for the Bone Switch.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toon } from '../player/nobuPrims.js';
import { canvasTex } from '../core/util.js';

const INK = '#1a0a24';
const VARIANTS = {
  green: { base: 0x3ec46d, emissive: 0x0a2a12, trim: 0x1f6a36, disc: '#15692f', ring: '#d8ffe0', emblem: 'bang' },
  blue: { base: 0x2a8cff, emissive: 0x08204a, trim: 0x174f9a, disc: '#123f86', ring: '#d8ecff', emblem: 'bone' },
};

function emblemTexture(v) {
  return canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = INK; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.fill();
    g.fillStyle = v.disc; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.fill();
    g.strokeStyle = v.ring; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 92, 0, 7); g.stroke();
    if (v.emblem === 'bang') {
      // a chunky hand-drawn "!" (not font dependent): rounded bar + dot, with an ink outline
      const bar = (pad, col) => {
        g.fillStyle = col;
        g.beginPath(); g.roundRect(104 - pad, 46 - pad, 48 + pad * 2, 104 + pad * 2, 22 + pad); g.fill();
        g.beginPath(); g.arc(128, 186, 22 + pad, 0, 7); g.fill();
      };
      bar(9, INK); bar(0, '#ffffff');
    } else {
      // a fat cartoon dog bone, tilted
      g.save(); g.translate(128, 128); g.rotate(-0.6);
      const bone = (pad, col) => {
        g.fillStyle = col;
        g.beginPath(); g.roundRect(-52 - pad, -17 - pad, 104 + pad * 2, 34 + pad * 2, 14); g.fill();
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) { g.beginPath(); g.arc(sx * 56, sy * 19, 24 + pad, 0, 7); g.fill(); }
      };
      bone(8, INK); bone(0, '#fff6e3');
      g.restore();
    }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(92, 80, 28, 12, -0.6, 0, 7); g.fill();
  });
}

const cache = {};
function parts(kind) {
  if (cache[kind]) return cache[kind];
  const v = VARIANTS[kind];
  const tex = emblemTexture(v);
  return (cache[kind] = {
    box: new RoundedBoxGeometry(0.96, 0.96, 0.96, 3, 0.07),
    edge: new THREE.BoxGeometry(1.0, 0.09, 0.09),
    decal: new THREE.PlaneGeometry(0.66, 0.66),
    mBox: new THREE.MeshPhongMaterial({ color: v.base, emissive: v.emissive, shininess: 40 }),
    mEdge: toon(v.trim),
    mDecal: new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.05, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }),
  });
}

export function switchCrate(kind = 'green') {
  const P = parts(kind);
  const g = new THREE.Group();
  const box = new THREE.Mesh(P.box, P.mBox); box.position.y = 0.48; g.add(box);
  // dark trim along all twelve edges
  for (let i = 0; i < 4; i++) {
    const sx = i & 1 ? 1 : -1, sz = i & 2 ? 1 : -1;
    const v = new THREE.Mesh(P.edge, P.mEdge); v.rotation.z = Math.PI / 2; v.position.set(sx * 0.47, 0.48, sz * 0.47); v.scale.x = 0.96; g.add(v);
    const hx = new THREE.Mesh(P.edge, P.mEdge); hx.position.set(0, i < 2 ? 0.03 : 0.93, sz * 0.47); g.add(hx);
    const hz = new THREE.Mesh(P.edge, P.mEdge); hz.rotation.y = Math.PI / 2; hz.position.set(sx * 0.47, i < 2 ? 0.03 : 0.93, 0); g.add(hz);
  }
  // emblem on the four sides and the top
  for (let i = 0; i < 4; i++) {
    const d = new THREE.Mesh(P.decal, P.mDecal);
    const a = (i * Math.PI) / 2;
    d.position.set(Math.sin(a) * 0.485, 0.48, Math.cos(a) * 0.485);
    d.rotation.y = a;
    g.add(d);
  }
  const top = new THREE.Mesh(P.decal, P.mDecal); top.rotation.x = -Math.PI / 2; top.position.y = 0.965; g.add(top);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// slow glow pulse on every switch emblem (call from any switch's update)
export function pulseSwitches(t) {
  const k = 0.2 + (Math.sin(t * 4) * 0.5 + 0.5) * 0.35;
  for (const P of Object.values(cache)) P.mDecal.emissiveIntensity = k;
}
