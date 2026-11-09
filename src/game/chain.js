// Rendering adapter: Session delegates combo feedback here; no Ticket path is involved.
import { BlueSphere } from '../entities/breakables.js';
import { audio } from '../audio/audio.js';
import { REWARD_TEXT } from '../story/script.js';
import { chainHit, endChain, tickChain, rewardCtx } from './rewards.js';

export function removeChainDrops(session, after = -Infinity) {
  const stage = session.stage;
  stage.entities = stage.entities.filter((e) => {
    if (!e.chainDrop || !(e.chainSeq > after)) return true;
    e.dead = true; e.obj?.removeFromParent();
    // The sphere geometry/glow material are shared; only its shadow owns a material.
    e.shadow?.material?.dispose();
    return false;
  });
}
export function finishSessionChain(session) {
  const n = endChain(session.chain);
  if (n >= 2) session.game.ui.chain?.(n, { ended: true });
}
export function updateSessionChain(session, dt) {
  const p = session.game.player;
  const ended = tickChain(session.chain, dt, { grounded: p.body?.grounded, ride: !!p.ride, busy: session.busy || p.dead || session.phase !== 'level' });
  if (ended >= 2) session.game.ui.chain?.(ended, { ended: true });
}
export function hitSessionChain(session, entity) {
  if (session.phase !== 'level' || entity?.countable === false) return;
  const hit = chainHit(session.chain, rewardCtx(session), entity);
  const g = session.game;
  if (hit.n >= 2) g.ui.chain?.(hit.n);
  if (hit.punch) {
    g.camera.shake(hit.n === 5 ? 0.12 : 0.2, hit.n === 5 ? 0.12 : 0.15);
    audio.play('chainUp');
  }
  if (hit.sphere) {
    const p = g.player, at = p.pos.clone();
    at.x += Math.sin(p.facing) * 1.2; at.z += Math.cos(p.facing) * 1.2;
    const track = session.stage.track;
    if (track) {
      const projection = track.project(at.x, at.z);
      if (!track.groundAt(projection.s, projection.u)) at.copy(p.pos);
    }
    const sphere = new BlueSphere(session.stage, at.x, at.y, at.z);
    sphere.countable = false; sphere.chainDrop = true; sphere.chainSeq = session.nextSeq();
    session.stage.add(sphere);
    g.ui.banner(...REWARD_TEXT.chainSphere, 1.2);
  }
  return hit;
}
