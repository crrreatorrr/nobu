// Pure chain policy shared by boss AI and its tests. Attack entry points still own
// their complete tells; the runner only removes the idle gap between attacks.
export const CHAIN_GRACE = 0.5;
const PUNISH = new Set(['stuck', 'tired', 'dizzy', 'overheat', 'stunned', 'pumped']);
export function chainBlocked(boss) {
  return !!(boss.vulnerable || boss.evolving || boss.ulting || boss.defeated ||
    PUNISH.has(boss.state) || boss.state === 'ultimate' || boss.state === 'frenzy');
}
export function clearChain(boss) { boss.chainQ = null; boss.chained = false; }
export function pickChain(boss, random = Math.random) {
  let choice = null, count = 0;
  for (const combo of boss.CHAINS?.[boss.phase] || []) {
    if (combo.length && combo.length <= boss.chainLen && random() * ++count < 1) choice = combo;
  }
  return choice;
}
export function startChain(boss, combo) {
  if (!combo?.length || combo.length > boss.chainLen || chainBlocked(boss) ||
      boss.sinceHurt <= CHAIN_GRACE || boss.game.player.dead) return false;
  boss.chainQ = combo.slice(1);
  boss.chained = true;
  boss.beginAttack(combo[0]);
  return true;
}
export function endAttack(boss) {
  if (boss.chainQ?.length && boss.sinceHurt > CHAIN_GRACE &&
      !boss.game.player.dead && !chainBlocked(boss)) {
    boss.beginAttack(boss.chainQ.shift());
    return true;
  }
  clearChain(boss);
  boss.afterAttack();
  return false;
}
