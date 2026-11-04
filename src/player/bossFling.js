// A boss-owned outward shove survives ordinary input acceleration without
// granting invulnerability or changing vertical movement. Collision and all
// other hazards still run through the usual Player update.
export function startBossFling(player, source, speed = 8) {
  if (player.bossFling?.source === source) return;
  const dx = player.pos.x - source.pos.x,
    dz = player.pos.z - source.pos.z;
  const distance = Math.hypot(dx, dz);
  player.bossFling = {
    source,
    x: distance ? dx / distance : 0,
    z: distance ? dz / distance : 1,
    speed,
    remaining: 0.8
  };
}

export function applyBossFling(player, dt) {
  const fling = player.bossFling;
  if (!fling) return;
  const source = fling.source;
  const clear =
    Math.hypot(player.pos.x - source.pos.x, player.pos.z - source.pos.z) >
    source.radius + 0.2 + Math.max(player.body.hw, player.body.hd);
  if (
    clear ||
    source.defeated ||
    !source.active ||
    source.stage !== player.game.stage ||
    player.dead ||
    player.mode === 'trapped' ||
    (fling.remaining -= dt) <= 0
  ) {
    player.bossFling = null;
    return;
  }
  player.vel.x = fling.x * fling.speed;
  player.vel.z = fling.z * fling.speed;
}
