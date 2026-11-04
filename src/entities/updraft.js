// Shared force law for fans and cleared Smog Vents. No temporary vectors per frame.
export function updraft(p, dt, origin, height = 7, power = 30) {
  const dx = p.pos.x - origin.x, dz = p.pos.z - origin.z;
  if (p.dead || dx * dx + dz * dz >= 1.2 || p.pos.y <= origin.y + 0.3 || p.pos.y >= origin.y + height) return false;
  p.vel.y = Math.min(11, p.vel.y + power * dt * 2);
  p.body.grounded = false;
  p.canDouble = true;
  return true;
}
