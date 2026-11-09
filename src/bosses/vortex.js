// Shared suction used by the Cone and, later, the Titan. No collision Solid or
// player-state ownership: the existing movement integrator consumes pushX/Z.
import { clamp, rand } from '../core/util.js';
const DEFAULT_PULL_OPTIONS = Object.freeze({});
export function pullToward(boss, strength, dt, { constant = false, center = boss.pos } = DEFAULT_PULL_OPTIONS) {
  const player = boss.player;
  const dx = center.x - player.pos.x, dz = center.z - player.pos.z;
  const distance = Math.hypot(dx, dz);
  if (player.dead) return distance;
  const force = strength * (constant ? 1 : clamp(1.4 - distance / 14, .4, 1.2));
  if (distance > .0001) {
    player.pushX = (player.pushX || 0) + dx / distance * force;
    player.pushZ = (player.pushZ || 0) + dz / distance * force;
  }
  if (boss.fx?.smokeCard && Math.random() < dt * 45) {
    const a = rand(0,Math.PI*2), r = rand(3,9), x = center.x+Math.cos(a)*r, z = center.z+Math.sin(a)*r;
    const y = (boss.ground ?? 0)+rand(.2,2.5), life = .5;
    boss.fx.smokeCard(x,y,z,{ vx:(center.x-x)/life,vy:(center.y-y)/life,vz:(center.z-z)/life,size:.18,life,colors:[0xe8d8ff],grow:-.5,g:0,drag:1,alpha:.5,fadeAt:.6 });
  }
  return distance;
}
