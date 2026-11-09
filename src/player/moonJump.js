export const MOON_JUMP = Object.freeze({ speed: 18.7, charge: 0.6, tap: 0.18 });

export function cancelMoonCharge(player) {
  player.moonHold = null;
  if (player.body.h < 1.3 && player.mode === 'normal') {
    // Keep the same standing headroom as slide, without arming Zoomies merely
    // because the neutral gesture ended.
    const p = player.pos,
      world = player.game.stage.world;
    const blocked = world.query(p.x - 0.3, p.y + 0.76, p.z - 0.3, p.x + 0.3, p.y + 1.3, p.z + 0.3, []).length;
    if (blocked) {
      player.mode = 'slide';
      player.slideT = 0.3;
      player.body.h = 0.75;
    } else player.body.h = 1.3;
  }
}

// Own only the earned neutral-slide gesture; a normal slide, paid air dash and
// ordinary jump keep their existing paths. The charge clock includes the .18s
// tap-disambiguation interval, so the charged cue occurs .6s after pressing.
export function advanceMoonCharge(player, dt, mag, input) {
  if (player.mode !== 'normal' || !player.body.grounded || player.ride || !player.abilities.moonJump) {
    if (player.moonHold) cancelMoonCharge(player);
    return false;
  }
  if (!player.moonHold && input.pressed('slide') && mag < 0.2) player.moonHold = { time: 0, charged: false };
  const hold = player.moonHold;
  if (!hold) return false;
  if (mag >= 0.2 || input.pressed('bite') || input.pressed('bark')) {
    cancelMoonCharge(player);
    return false;
  }
  if (!input.held('slide')) {
    const tap = hold.time < MOON_JUMP.tap;
    cancelMoonCharge(player);
    if (tap) player._startSlide(player.facing);
    return true;
  }
  hold.time += dt;
  if (hold.time >= MOON_JUMP.tap) player.body.h = 0.8;
  if (hold.time >= MOON_JUMP.charge - 1e-9 && !hold.charged) {
    hold.charged = true;
    player._moonCharged();
  }
  return true;
}
