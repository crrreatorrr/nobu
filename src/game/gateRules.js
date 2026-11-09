import { ConedDog } from '../entities/dogs.js';

export const MOON_LEDGE_MIN = 6.2;
export const gateReachable = (dist, open, speed) => dist >= 0 && open > 0 && speed > 0 && dist < open * speed;

// Surfaces are world-space standable rectangles, including nearby stepping stones.
export function moonLedgeViolations(ledge, surfaces) {
  return surfaces.filter((s) => {
    const dx = Math.max(s.min.x - ledge.x, 0, ledge.x - s.max.x);
    const dz = Math.max(s.min.z - ledge.z, 0, ledge.z - s.max.z);
    return dx * dx + dz * dz <= 16 && ledge.y - s.max.y < MOON_LEDGE_MIN - 1e-8;
  });
}

export function gatedCountables(entities) {
  const gates = entities.filter((e) => e.gatedBox);
  return entities.flatMap((e) => {
    if (!e.countable && !(e instanceof ConedDog) && !e.isConedDog) return [];
    return gates.filter((g) => {
      const b = g.gatedBox, p = e.pos;
      return p.x >= b.min.x && p.x <= b.max.x && p.y >= b.min.y && p.y <= b.max.y && p.z >= b.min.z && p.z <= b.max.z;
    }).map((gate) => ({ entity: e, gate }));
  });
}
