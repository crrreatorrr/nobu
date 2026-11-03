// The only place that reads which Relics this session owns.
// HubBridge.init() already stored the result on hub.profile. This does not call the SDK.
// A later server loadout replaces this function's body; callers stay put.
// Nothing here grants a Relic or writes Tickets, beaten flags, or leaderboards.

import { hub } from '../hub/hubBridge.js';
import { NOBU_ITEMS } from './catalog.js';

export function readNobuOwnership() {
  const profile = hub.profile;
  if (!profile || typeof profile !== 'object') return { ready: false, ranked: false, itemIds: [] };
  // Only a live hub session knows what this player owns. Opened outside the hub, or
  // with a hub login that failed, the SDK returns a standalone profile with no relics.
  // That is "unknown", not "owns nothing".
  if (hub.reach !== 'ready' || !hub.inSession) return { ready: false, ranked: false, itemIds: [] };
  const relics = Array.isArray(profile.relics) ? profile.relics : [];
  const itemIds = [];
  for (const item of NOBU_ITEMS) {
    // relic === null would be a starter. Cone's Tip is not in the catalog, so it never matches.
    if (item.relic && relics.indexOf(item.relic) !== -1) itemIds.push(item.id);
  }
  return { ready: true, ranked: profile.ranked === true, itemIds };
}
