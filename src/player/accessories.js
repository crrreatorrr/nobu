// Hats and collars parented to Nobu's sockets. Authored in metres at his 1.5 m size.
// A missing GLB always falls back to these procedural meshes.
// Neck holds one mesh: Golden Collar or Clown-Nose Collar. Head holds one: a Wizard Hat or Champion's Crown.
// Items pick their model through catalog `cosmetic.mesh` (itemMesh), so Wizard Hat II draws the Wizard Hat.
// GLBs follow the manifest convention: asset id `model_<item id>`, file `models/<item id>.glb`.

import * as THREE from 'three';
import { Assets } from '../art/assets.js';
import { itemMesh } from '../gear/catalog.js';

function cloth(color, emissive) {
  return new THREE.MeshLambertMaterial({ color, emissive });
}

function buildWizardHat() {
  const g = new THREE.Group();
  const purple = cloth(0xa66bff, 0x2a1458);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 12), purple);
  cone.position.y = 0.28;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.035, 16), purple);
  brim.position.y = 0.04;
  g.add(cone, brim);
  const star = cloth(0xfff1a8, 0xaa8830);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), star);
    const a = (i / 3) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.1, 0.48, Math.sin(a) * 0.1);
    g.add(s);
  }
  g.userData.kind = 'hat';
  return g;
}

// Champion's Crown (Tidebreaker Belt). From the approved concept: chunky gold band with five
// rounded points, teal sea-glass gems, white pearl trim, a small wave emblem on the front.
// Base sits at y = 0; +z is Nobu's front. dressNobuModel tilts it between the ears.
// Fallback for when models/nobu_champions_crown.glb (the Tripo model of the same concept) is missing.
export function buildChampionsCrown() {
  const g = new THREE.Group();
  const gold = cloth(0xffc83a, 0x7a4c00);
  const goldInside = new THREE.MeshLambertMaterial({ color: 0xd99a1e, emissive: 0x4a2c00, side: THREE.DoubleSide });
  const seaGlass = new THREE.MeshLambertMaterial({ color: 0x35d6c3, emissive: 0x0d5e55 });
  const pearl = new THREE.MeshLambertMaterial({ color: 0xfdf8ee, emissive: 0x5c564a });
  const R = 0.15;
  const base = 0.02;
  const bandH = 0.075;
  const top = base + bandH;
  const at = (a, r) => [Math.sin(a) * r, Math.cos(a) * r];

  // Band: open cylinder (inside visible), with a rounded rim on top.
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.05, bandH, 20, 1, true), goldInside);
  band.position.y = base + bandH / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.014, 6, 24), gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = top;
  g.add(band, rim);

  // Pearl trim round the bottom edge.
  const pearls = 16;
  const pearlGeo = new THREE.SphereGeometry(0.019, 8, 6);
  for (let i = 0; i < pearls; i++) {
    const [x, z] = at((i / pearls) * Math.PI * 2, R * 1.05 + 0.006);
    const p = new THREE.Mesh(pearlGeo, pearl);
    p.position.set(x, base, z);
    g.add(p);
  }

  // Five rounded points, the first one at the front.
  const pointGeo = new THREE.ConeGeometry(0.046, 0.1, 10);
  const knobGeo = new THREE.SphereGeometry(0.027, 10, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const [x, z] = at(a, R * 0.98);
    const point = new THREE.Mesh(pointGeo, gold);
    point.position.set(x, top + 0.045, z);
    point.rotation.set(Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12);
    const knob = new THREE.Mesh(knobGeo, gold);
    knob.position.set(x * 1.06, top + 0.1, z * 1.06);
    g.add(point, knob);
    // Teal sea-glass gem in the band between this point and the next.
    const [gx, gz] = at(a + Math.PI / 5, R * 1.03 + 0.008);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), seaGlass);
    gem.position.set(gx, base + bandH * 0.55, gz);
    gem.scale.set(1, 1.2, 0.7);
    gem.lookAt(gx * 2, gem.position.y, gz * 2);
    g.add(gem);
  }

  // Wave emblem on the front: gold medallion, teal curl, white crest.
  const front = R * 1.05 + 0.01;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.014, 16), gold);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, base + bandH * 0.5, front);
  const curl = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0065, 6, 14, Math.PI * 1.4), seaGlass);
  curl.position.set(-0.004, base + bandH * 0.5, front + 0.009);
  curl.rotation.z = -0.5;
  const crest = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), pearl);
  crest.position.set(0.012, base + bandH * 0.5 + 0.016, front + 0.01);
  g.add(disc, curl, crest);

  g.userData.kind = 'crown';
  return g;
}

// Rakish tilt so the crown sits between the ears, not dead level.
export const CROWN_TILT = { x: -0.1, z: -0.24 };
// The GLB crown's band is narrower than the procedural one (0.26 m across at 0.22 m tall), so it is
// loaded taller and lifted a little: its band then clears the brow and the wave emblem shows,
// matching where the procedural crown's pearl trim sits.
export const CROWN_GLB = { height: 0.28, lift: 0.03 };

function buildGoldenCollar() {
  const g = new THREE.Group();
  const gold = cloth(0xffd24a, 0xffb000);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 18), gold);
  band.rotation.x = Math.PI / 2;
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.018, 14), gold);
  coin.position.set(0, -0.02, 0.16);
  coin.rotation.x = Math.PI / 2;
  g.add(band, coin);
  g.userData.kind = 'golden';
  return g;
}

function buildClownCollar() {
  const g = new THREE.Group();
  const ruff = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.045, 8, 18),
    new THREE.MeshLambertMaterial({ color: 0xfff6ee, emissive: 0x665544 }),
  );
  ruff.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xe0232a, emissive: 0x6a1014 }),
  );
  nose.position.set(0, 0.02, 0.2);
  g.add(ruff, nose);
  g.userData.kind = 'clown';
  return g;
}

function takeMesh(id, height, fallback) {
  // Assets only loads manifest GLBs whose id starts with model_ (see art/assets.js).
  const loaded = Assets.model(`model_${id}`, height);
  return loaded || fallback();
}

function clearGear(model) {
  for (const key of ['gearHat', 'gearCollar']) {
    const acc = model[key];
    if (!acc) continue;
    const mine = acc.userData.meshes || [];
    if (model.allMeshes) model.allMeshes = model.allMeshes.filter((mesh) => mine.indexOf(mesh) === -1);
    acc.parent?.remove(acc);
    model[key] = null;
  }
  for (const mesh of model.bandana || []) mesh.visible = true;
}

function attach(model, socket, acc, { lift = 0, key }) {
  if (!socket || !acc) return;
  model.root.updateMatrixWorld(true);
  const world = new THREE.Vector3();
  socket.getWorldScale(world);
  const s = Math.max(1e-4, Math.abs(world.x));
  // Multiply, don't set: a GLB from Assets.model() already carries its height as its scale.
  acc.scale.multiplyScalar(1 / s);
  acc.position.set(0, lift / s, 0);
  socket.add(acc);
  const meshes = [];
  acc.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.frustumCulled = false;
    obj.userData.nobuGear = true;
    meshes.push(obj);
    model.allMeshes?.push(obj);
  });
  acc.userData.meshes = meshes;
  model[key] = acc;
}

export function dressNobuModel(model, loadout) {
  if (!model) return;
  clearGear(model);
  const show = loadout?.cosmeticSlots?.() || {};
  // Head holds one id, so the hat and the crown never show together.
  const head = itemMesh(show.head);
  if (head === 'nobu_wizard_hat' && model.headSocket) {
    attach(model, model.headSocket, takeMesh('nobu_wizard_hat', 0.55, buildWizardHat), {
      lift: model.hatLift ?? 0.2,
      key: 'gearHat',
    });
  } else if (head === 'nobu_champions_crown' && model.headSocket) {
    const glb = Assets.model('model_nobu_champions_crown', CROWN_GLB.height);
    const crown = glb || buildChampionsCrown();
    crown.userData.kind = 'crown';
    crown.rotation.set(CROWN_TILT.x, 0, CROWN_TILT.z);
    attach(model, model.headSocket, crown, {
      lift: (model.hatLift ?? 0.2) + (glb ? CROWN_GLB.lift : 0),
      key: 'gearHat',
    });
  }
  if (show.neck === 'nobu_golden_collar' && model.neckSocket) {
    attach(model, model.neckSocket, takeMesh('nobu_golden_collar', 0.2, buildGoldenCollar), {
      lift: 0,
      key: 'gearCollar',
    });
  } else if (show.neck === 'nobu_clown_collar' && model.neckSocket) {
    attach(model, model.neckSocket, takeMesh('nobu_clown_collar', 0.22, buildClownCollar), {
      lift: 0,
      key: 'gearCollar',
    });
  }
  if (show.neck) {
    for (const mesh of model.bandana || []) mesh.visible = false;
  }
}

// Gold while the guard has a charge, dull once it is spent. Hurt flash overwrites this until it ends.
export function setCollarGlow(model, charged) {
  const acc = model?.gearCollar;
  if (!acc || acc.userData.kind !== 'golden') return;
  const color = charged ? 0xffd24a : 0x7a6230;
  const emissive = charged ? 0xffb000 : 0x2a210c;
  acc.traverse((obj) => {
    if (!obj.isMesh || !obj.material?.color || !obj.material.emissive) return;
    obj.material.color.setHex(color);
    obj.material.emissive.setHex(emissive);
  });
}
