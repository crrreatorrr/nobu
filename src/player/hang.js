// Zipline movement uses the straight gameplay line; the visible cable alone sags.
export const HANG = 1.25;

export function advanceHang(player, dt, jump, jumpPower) {
  const hang = player.hang, line = hang.line;
  hang.t = Math.min(1, hang.t + line.speed * dt / line.length);
  player.pos.lerpVectors(line.A, line.B, hang.t); player.pos.y -= HANG;
  player.facing = player.targetFacing = Math.atan2(line.velocity.x, line.velocity.z);
  player.body.grounded = false; player.body.ground = null;
  player.vel.set(0, 0, 0);
  if (!jump && hang.t < 1) return false;
  player.hang = null;
  player.vel.copy(line.velocity).multiplyScalar(jump ? 1 : 0.6);
  player.vel.y += jump ? jumpPower * 0.85 : 6;
  player.canDouble = true; player.jumpCut = !jump; player.jumpT = 0;
  player.jumpBuffer = 0; player.coyote = 0;
  line.blockGrabT = 0.25;
  return true;
}
