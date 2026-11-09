import { LEVEL_BUDGETS } from '../levels/data/budgets.js';
import { measureTicketBudget } from './measureTicketBudget.js';
import { budgetDifferences, checkTicketBudget } from './ticketBudget.js';

/** Inspect immediately after T.go(id), before breaking or collecting anything. */
export function inspectTicketBudget(game) {
  const s = game.session;
  if (!s?.stage || !s.tickets) throw new Error('Start a level before T.budget()');
  if (s.phase === 'boss' || s.trial || s.remix || s.rush || s.devStrip) throw new Error('T.budget() requires a fresh ordinary level');
  const declared = LEVEL_BUDGETS[s.level];
  if (!declared) throw new Error(`No declared Ticket budget for ${s.level}`);
  // The builder test independently measures arenas. Runtime inspects the current
  // stage, then includes that separately verified arena before rounding.
  const measured = measureTicketBudget(s.stage, s.tickets, declared.arena);
  const differences = budgetDifferences(declared, measured);
  let ceiling;
  try { ceiling = checkTicketBudget(s.level, measured); }
  catch (error) { ceiling = { error: error.message }; }
  const report = { level: s.level, measured, declared, differences, ...ceiling };
  if (differences.length || ceiling.error) console.error('Ticket budget mismatch', report);
  else console.table(report.measured);
  return report;
}
