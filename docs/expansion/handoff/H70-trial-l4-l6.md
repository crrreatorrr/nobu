# H70: Trial boards for Levels 4, 5 and 6

| | |
| --- | --- |
| Branch | `codex/trial-l4-l6` from the latest `main` |
| Size | S |
| Needs merged first | H40, H45, H50 and a metaverse-hub PR adding variants 4, 5, 6 (owner deploys) |
| Can run alongside | — |
| Unblocks | — |

## Goal

Post L4, L5 and L6 trial times to the hub once it accepts those variants.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/gameplay-expansion-plan.md` 10.2
- the floors in new-levels spec (L4, L5) and level6 spec 9

## Files

**Change or create:**

- `src/config/trials.js` (`TRIAL_LEVELS`, `TRIAL_FLOOR_MS`)
- metaverse-hub `leaderboard.ts` in a separate PR (like H35)
- `tests/trials-bounds.test.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Hub PR first (same shape as H35).
2. Then add the levels to `TRIAL_LEVELS` with matching floors.

## Tests

- trials-bounds cases for 4, 5, 6

## Done when

- Times post for every level on the right board
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- One trial each on L4, L6, L5 from the hub

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Post Level 4, 5 and 6 trial times to the hub`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
