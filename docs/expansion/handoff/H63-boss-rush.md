# H63: Boss Rush: Cone Gauntlet

| | |
| --- | --- |
| Branch | `codex/boss-rush` from the latest `main` |
| Size | M |
| Needs merged first | H51 |
| Can run alongside | H62 |
| Unblocks | — |

## Goal

All five bosses back to back with no DDA, timed, with clear and no-hit medals.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/gameplay-expansion-plan.md` 8
- `docs/expansion/rewards-spec.md` 0 (`rush` context), 9.1 (3 + 3 mastery points)
- `docs/expansion/bosses-spec.md` 1.7

## Files

**Change or create:**

- `src/game/session.js` (rush session)
- `src/levels/registry.js` (`rush` entry)
- `src/game/game.js` (map node and results)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Chain the five arenas; masks carry over; a death restarts the current boss.
2. No DDA, no Wizard Hat skip.
3. Save `rush` results.

## Tests

- rush medal rules

## Done when

- The rush runs start to finish
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- One full rush

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add the Boss Rush`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
