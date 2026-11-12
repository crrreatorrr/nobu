import { arenaCamera } from './arenaCameras.js';
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
    camera: arenaCamera('queen'),
    // The Queen stands in the middle of the frame all fight, with her head and crown where the boss bar
    // usually is, so here the bar sits at the top left instead (plan F3).
    bossBar: 'left',
    spheres: [
      new THREE.Vector3(-11.7, 0, 11.7),
      new THREE.Vector3(11.7, 0, 11.7),
      new THREE.Vector3(0, 0, -11.7),
      new THREE.Vector3(0, 4.2, -7.5)
    ]
  };
}
