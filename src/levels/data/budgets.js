// Raw, worst-case authored sources. Arena pickups join the same raw remainder.
// These declarations are checked against the real builders in level-budget.test.js.
export const LEVEL_BUDGETS = Object.freeze(Object.fromEntries(Object.entries({
  1: { field: 112, packs: 150, zipped: 16, jackpots: 27, bark: 10, trampoline: 10, mystery: 2, arena: 7, coconut: true },
  2: { field: 90, packs: 90, zipped: 0, jackpots: 15, bark: 15, trampoline: 0, mystery: 2, arena: 7, coconut: false },
  3: { field: 52, packs: 60, zipped: 8, jackpots: 12, bark: 10, trampoline: 0, mystery: 2, arena: 7, coconut: false },
  ride: { field: 55, packs: 35, zipped: 8, jackpots: 0, bark: 0, trampoline: 0, mystery: 0, arena: 0, coconut: false },
  cave: { field: 39, packs: 55, zipped: 16, jackpots: 0, bark: 15, trampoline: 0, mystery: 0, arena: 0, coconut: false },
}).map(([id, budget]) => [id, Object.freeze(budget)])));
