import { BONUS_BUDGETS_V2 } from './bonus-layout2.js';
// Raw, worst-case authored sources. Arena pickups join the same raw remainder.
// These declarations are checked against the real builders in level-budget.test.js.
export const LEVEL_BUDGETS = Object.freeze(Object.fromEntries(Object.entries({
  1: { field: 207, packs: 262, zipped: 24, jackpots: 27, bark: 10, trampoline: 10, mystery: 2, arena: 7, coconut: true },
  2: { field: 90, packs: 90, zipped: 0, jackpots: 15, bark: 15, trampoline: 0, mystery: 2, arena: 7, coconut: false },
  3: { field: 52, packs: 60, zipped: 8, jackpots: 12, bark: 10, trampoline: 0, mystery: 2, arena: 7, coconut: false },
  ride: BONUS_BUDGETS_V2.ride,
  cave: BONUS_BUDGETS_V2.cave,
}).map(([id, budget]) => [id, Object.freeze(budget)])));
