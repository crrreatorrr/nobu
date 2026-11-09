import { COCONUT_CAP_PER_CLEAR, MYSTERY_RAW_MAX, LEVEL_TICKET_CAP, wholeTicketsFromRaw } from '../config/tickets.js';

export const BUDGET_FIELDS = Object.freeze(['field', 'packs', 'zipped', 'jackpots', 'bark', 'trampoline', 'mystery', 'arena', 'coconut']);

export function ticketBudget(budget) {
  const raw = budget.field + budget.packs + budget.zipped + budget.jackpots + budget.bark
    + budget.trampoline + budget.mystery * MYSTERY_RAW_MAX + budget.arena;
  const coconut = budget.coconut ? COCONUT_CAP_PER_CLEAR : 0;
  return { raw, coconut, wholeMax: wholeTicketsFromRaw(raw) + coconut + (budget.firstClearWhole ?? 0) };
}

export function checkTicketBudget(id, budget, cap = LEVEL_TICKET_CAP[id]) {
  for (const key of BUDGET_FIELDS) {
    if (key === 'coconut' ? typeof budget[key] !== 'boolean' : !Number.isInteger(budget[key]) || budget[key] < 0) {
      throw new Error(`Invalid Ticket budget ${id}.${key}`);
    }
  }
  if (budget.firstClearWhole !== undefined && (!Number.isInteger(budget.firstClearWhole) || budget.firstClearWhole < 0)) {
    throw new Error(`Invalid Ticket budget ${id}.firstClearWhole`);
  }
  if (!Number.isInteger(cap) || cap < 0) throw new Error(`Missing Ticket cap for ${id}`);
  const result = ticketBudget(budget);
  if (result.wholeMax > cap) throw new Error(`Ticket budget ${id}: ${result.wholeMax} exceeds fixed cap ${cap}`);
  return { ...result, cap };
}

export function budgetDifferences(declared, measured) {
  const value = (budget, key) => key === 'firstClearWhole' ? (budget[key] ?? 0) : budget[key];
  return [...BUDGET_FIELDS, 'firstClearWhole'].filter((key) => value(declared, key) !== value(measured, key))
    .map((key) => ({ source: key, declared: value(declared, key), measured: value(measured, key) }));
}
