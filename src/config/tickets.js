// Ticket balance for NOBU. Every source is scaled here; only whole Tickets are banked.

/** Applied to every Ticket source. Fractional remainder stays on the attempt. */
export const NOBU_TICKET_SCALE = 1 / 3;

/** Whole Tickets from coconuts in one clear, after scaling. */
export const COCONUT_CAP_PER_CLEAR = 15;

/** Whole Tickets that may wait for the next session. Anything above this is discarded. */
export const CARRY_MAX = 100;

/** Server max_amount for one level_end earnTickets call. Larger earns are chunked. */
export const LEVEL_END_MAX_AMOUNT = 20;

/** Maximum Mystery payout: three whole Tickets, counted once in level budgets. */
export const MYSTERY_RAW_MAX = 9;

const SCALE_DENOMINATOR = Math.round(1 / NOBU_TICKET_SCALE);

/** Whole Tickets represented by `raw` unscaled pickups. The remainder stays in `raw`. */
export function wholeTicketsFromRaw(raw) {
  return Math.floor(Math.max(0, raw) / SCALE_DENOMINATOR);
}

/** Unscaled pickups that scale to exactly `whole` Tickets. */
export function rawTicketsForWhole(whole) {
  return Math.max(0, whole) * SCALE_DENOMINATOR;
}

/** Fixed authoring ceilings, proposed from the measured layout-1 density.
 * Owner sign-off is required before H12 merges; see docs/expansion/h12-review.md.
 * Never derive these from a level's current budget: an over-cap edit must fail. */
export const LEVEL_TICKET_CAP = Object.freeze({
  1: 205, 2: 183, 3: 101, ride: 110, cave: 89,
  4: 184, 6: 159, 5: 162,
});
