// Hub payouts (Hub Tickets through hub.bank, the cross-game cones_tip Relic through hub.reportCone)
// are only sent for runs God Mode never touched. A run is God-assisted when God Mode was on at its
// start, was switched on at any point during it (session.godUsed, see Session.markGodUsed), or is on
// now. Local progress (the save's Tickets, medals, unlocks) is unchanged; only the hub sends stop.
// hub.submitScore already skips God-assisted trials in Session._finishTrial.
import { save } from '../core/save.js';
import { hub } from '../hub/hubBridge.js';

export function hubRewardsBlocked(session, data = save.data) {
  return !!(data?.godMode || session?.godUsed || session?.stats?.godUsed || session?.game?.player?.god);
}

// hub.bank for this attempt's whole Tickets, unless the run is God-assisted.
export function bankAttempt(session, { amount = session?.levelTickets, durable = session?.attemptDurable } = {}) {
  if (!session || hubRewardsBlocked(session)) return Promise.resolve(false);
  return hub.bank(session.attemptId, amount, durable)
    .then(() => true, (err) => { console.warn('[hub] bank failed', err); return false; });
}

// hub.reportCone (the cones_tip Relic), unless the run is God-assisted.
export function reportConeRelic(session) {
  if (!session || hubRewardsBlocked(session)) return Promise.resolve(false);
  return hub.reportCone(session.attemptId, session.attemptDurable)
    .then(() => true, (err) => { console.warn('[hub] relic failed', err); return false; });
}
