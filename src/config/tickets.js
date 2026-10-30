// Ticket balance for NOBU. Every source is scaled here; only whole Tickets are banked.

/** Applied to every Ticket source. Fractional remainder stays on the attempt. */
export const NOBU_TICKET_SCALE = 1 / 3;

/** Whole Tickets from coconuts in one clear, after scaling. */
export const COCONUT_CAP_PER_CLEAR = 15;

/** Whole Tickets that may wait for the next session. Anything above this is discarded. */
export const CARRY_MAX = 100;

/** Server max_amount for one level_end earnTickets call. Larger earns are chunked. */
export const LEVEL_END_MAX_AMOUNT = 20;

const SCALE_DENOMINATOR = Math.round(1 / NOBU_TICKET_SCALE);

/** Whole Tickets represented by `raw` unscaled pickups. The remainder stays in `raw`. */
export function wholeTicketsFromRaw(raw) {
  return Math.floor(Math.max(0, raw) / SCALE_DENOMINATOR);
}

/** Unscaled pickups that scale to exactly `whole` Tickets. */
export function rawTicketsForWhole(whole) {
  return Math.max(0, whole) * SCALE_DENOMINATOR;
}
