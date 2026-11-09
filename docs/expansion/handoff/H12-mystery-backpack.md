# H12: Mystery Backpack and the per-level Ticket budget test

| | |
| --- | --- |
| Branch | `codex/mystery-backpack` from the latest `main` |
| Size | M |
| Needs merged first | H01 (and H04b for `k.mystery` if it lands first; otherwise add the helper here) |
| Can run alongside | H10, H11 |
| Unblocks | H30–H33, H40, H45, H50 |

## Goal

Add the seeded Mystery Backpack and a test that every level's maximum Tickets stays under its cap.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 3 (Mystery Backpack, seeded per run), 10 (Ticket guardrails, measuring procedure, caps, how the test gets each level's maximum), 17 (`mystery.test.js`, `level-budget.test.js`)
- `src/config/tickets.js`, `src/entities/tickets.js`, `tests/earn.test.js`, `tests/level-end-chunks.test.js`

## Files

**Change or create:**

- new `src/game/rng.js`
- `src/entities/breakables.js` (`MysteryBackpack`)
- `src/levels/kit.js` (`k.mystery`)
- `src/config/tickets.js` (`LEVEL_TICKET_CAP` per level)
- each level file: a `BUDGET` export as the rewards spec 10.5 describes
- `src/dev.js` (`T.budget()` measuring command)
- two Mystery Backpacks each in L1–L3 at side-path spots

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Measure today's per-level max with `T.budget()` and write the numbers into the PR and into rewards spec 10.3 (replace the static estimate).
2. Set the caps from 10.4 scaled by the measurement; flag them for owner sign-off in the PR.
3. Build the seeded roll and the entity (rollback restores the same result).
4. Budget test reads each level's `BUDGET` export.

## Tests

- `tests/mystery.test.js` and `tests/level-budget.test.js`: the cases in rewards spec 17

## Done when

- The measured numbers replace the estimates in the spec
- Budget test fails if a level's max goes over its cap
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Open each Mystery Backpack in L1; die and reopen: same result; restart the level: may differ

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add the Mystery Backpack and a per-level Ticket budget test`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

## Owner decisions this task needs

- Sign off on the per-level Ticket caps (plan 12 risk 5) before merge
