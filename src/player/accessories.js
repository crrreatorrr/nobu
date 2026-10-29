// Hats and collars parented to Nobu's sockets. Authored in metres at his 1.5 m size.
// A missing GLB always falls back to these procedural meshes.
// Neck holds one mesh: Golden Collar or Clown-Nose Collar.

import * as THREE from 'three';
import { Assets } from '../art/assets.js';

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
  const loaded = Assets.model(id, height);
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
  acc.scale.setScalar(1 / s);
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
  if (show.head === 'nobu_wizard_hat' && model.headSocket) {
    attach(model, model.headSocket, takeMesh('nobu_wizard_hat', 0.55, buildWizardHat), {
      lift: model.hatLift ?? 0.2,
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
