import { Backpack, ZippedBackpack } from '../entities/breakables.js';

/** Whole Tickets one Level 2 clear can award. Raw sources below sum to 51. */
export const LEVEL2_WHOLE_TICKETS = 17;

/** Field pickups that are not the dust-wall jackpot. Kept spread along the canyon. */
const FIELD_PICKUPS = 17;

function spacedIndexes(length, keep) {
  if (keep >= length) return Array.from({ length }, (_, i) => i);
  const used = new Set();
  const out = [];
  for (let i = 0; i < keep; i++) {
    let idx = keep === 1 ? 0 : Math.round((i * (length - 1)) / (keep - 1));
    let up = idx;
    let down = idx - 1;
    while (used.has(idx) && (up < length || down >= 0)) {
      if (up < length && !used.has(up)) idx = up;
      else if (down >= 0 && !used.has(down)) idx = down;
      else { up++; down--; }
    }
    used.add(idx);
    out.push(idx);
  }
  return out;
}

/** Leave the canyon's length, sections, enemies, backpacks and dogs in place.
 * Backpacks still count toward a full clear and pay no Tickets. Extra field
 * pickups are removed. Yarn stays a hazard and is not a Ticket source. */
export function settleLevel2Tickets(stage, tickets) {
  for (const e of stage.entities) {
    if (e instanceof Backpack && !(e instanceof ZippedBackpack)) {
      e.tickets = 0;
      e.authoredTickets = 0;
    }
  }
  const regular = tickets.list.filter((t) => t.source !== 'jackpot');
  const keep = new Set(spacedIndexes(regular.length, FIELD_PICKUPS).map((i) => regular[i]));
  for (const t of tickets.list) if (t.source === 'jackpot') keep.add(t);
  tickets.list = tickets.list.filter((t) => keep.has(t));
}
