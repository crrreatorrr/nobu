import { Backpack, ZippedBackpack, Trampoline } from '../entities/breakables.js';
import { MysteryBackpack } from '../entities/mysteryBackpack.js';
import { GoodBoyRoute, BarkRock } from '../entities/secrets.js';
import { CoconutRoller } from '../entities/props.js';

/** Call on a fresh built stage. Count every authored payer, including bonus-round
 * and non-countable packs. Runtime-spawned Mystery prizes are covered by its slot. */
export function measureTicketBudget(stage, tickets, arena = 0) {
  const result = { field: tickets.list.length, packs: 0, zipped: 0, jackpots: 0,
    bark: 0, trampoline: 0, mystery: 0, arena, coconut: false };
  const prizes = new Set(stage.entities.flatMap((e) => e instanceof MysteryBackpack ? e.spawned : []));
  for (const e of stage.entities) {
    if (prizes.has(e)) continue;
    if (e instanceof MysteryBackpack) result.mystery++;
    // Two partial hits each pay one, and the final hit pays at least one.
    else if (e instanceof ZippedBackpack) result.zipped += Math.max(3, e.authoredTickets ?? 8);
    else if (e instanceof Backpack) result.packs += e.authoredTickets ?? 5;
    else if (e instanceof Trampoline) result.trampoline += e.ticketsMax;
    else if (e instanceof GoodBoyRoute) result.jackpots += e.jackpot;
    else if (e instanceof BarkRock) result.bark += e.tickets;
    else if (e instanceof CoconutRoller) result.coconut = true;
  }
  return result;
}
