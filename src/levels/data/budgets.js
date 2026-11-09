import { PIPELINE_BUDGET } from './pipelineBudget.js';
import { LAUNDRY_BUDGET } from './laundryBudget.js';
import { BONUS_BUDGETS_V2 } from './bonus-layout2.js';
import { GAUNTLET_FIRST_CLEAR_TICKETS } from '../../config/tickets.js';
const gauntletBudget = { field: 0, packs: 0, zipped: 0, jackpots: 0, bark: 0,
  trampoline: 0, mystery: 0, arena: 0, coconut: false, firstClearWhole: GAUNTLET_FIRST_CLEAR_TICKETS };
// Raw, worst-case authored sources. Arena pickups join the same raw remainder.
// These declarations are checked against the real builders in level-budget.test.js.
export const LEVEL_BUDGETS = Object.freeze(Object.fromEntries(Object.entries({
  g1: gauntletBudget, g2: gauntletBudget, g3: gauntletBudget,
  4: LAUNDRY_BUDGET,
  5: PIPELINE_BUDGET,
  6: { field: 116, packs: 175, zipped: 3, jackpots: 0, bark: 0, trampoline: 0, mystery: 3, arena: 0, coconut: false },
  1: { field: 207, packs: 262, zipped: 24, jackpots: 27, bark: 10, trampoline: 10, mystery: 2, arena: 7, coconut: true },
  // 51 raw and no coconut allowance: floor(51 / 3) = 17 whole. Backpacks stay and pay 0.
  2: { field: 20, packs: 0, zipped: 0, jackpots: 3, bark: 3, trampoline: 0, mystery: 2, arena: 7, coconut: false },
  3: { field: 83, packs: 149, zipped: 8, jackpots: 27, bark: 10, trampoline: 0, mystery: 2, arena: 7, coconut: false },
  ride: BONUS_BUDGETS_V2.ride,
  cave: BONUS_BUDGETS_V2.cave,
}).map(([id, budget]) => [id, Object.freeze(budget)])));
