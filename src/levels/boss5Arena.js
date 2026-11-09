import * as THREE from 'three';
import { makeKit } from './kit.js';
import { buildQueenArena } from '../bosses/queenArena.js';

export function buildBoss5Arena(game, stage, tickets) {
  const k = makeKit(game, stage, tickets),
    parts = buildQueenArena(stage);
  k.tix(-6, 0, 11.7, 6, 0, 11.7, 7);
  return {
    ...parts,
    spawn: new THREE.Vector3(0, 0, 11.7),
    facing: Math.PI,
    camera: { mode: 'arena', center: new THREE.Vector3(), offset: { x: 0, y: 15, z: 19 }, follow: 0.4 },
    spheres: [
      new THREE.Vector3(-11.7, 0, 11.7),
      new THREE.Vector3(11.7, 0, 11.7),
      new THREE.Vector3(0, 0, -11.7),
      new THREE.Vector3(0, 4.2, -7.5)
    ]
  };
}
