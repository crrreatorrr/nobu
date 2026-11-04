# H06: Golden Bone fixes for Scratchpost Canyon and Roomba Rush

| | |
| --- | --- |
| Branch | `codex/golden-bone-fixes` from the latest `main` |
| Size | S |
| Needs merged first | nothing (do this first) |
| Can run alongside | any task that touches other files |
| Unblocks | H31, H33 (they extend the same files) |

## Goal

Make every countable breakable in Scratchpost Canyon (L2) and Roomba Rush breakable in one run, and add tests so no chase or ride can become impossible again. Today L2's last checkpoint segment can't be cleared and Roomba Rush has four places where only one of two or three side-by-side breakables can be hit.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/golden-bone-audit.md` (the whole file: findings, numbers, exact fixes)
- `tools/audit/chase-budget.mjs` and `tools/audit/ride-reach.mjs` (the models to port)
- `src/bosses/bigCat.js` `ChaseCat.update` (rubber band) and `src/player/player.js` (ride branch, bite and slide)

## Files

**Change or create:**

- `src/levels/level2.js`: the 4 edits in the audit's L2 fix (Snacks at D(238), stack to D(242), `packWall(250, true)`, plain pack at D(270))
- `src/levels/bonusRide.js`: the 4 stagger edits in the audit's Roomba Rush table
- new `src/levels/data/l2-chase.js` and `src/levels/data/ride-breakables.js`: the breakable and checkpoint lists as plain data, imported by the level files so the tests read the real placements
- new `tests/chase-budget.test.js` and `tests/ride-reach.test.js` (port the models)

**Don't touch:**

- other level files
- `ChaseCat` tuning (the speed stays as it is; only placements change)
- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Move the L2 breakable and Snacks placements that the chase test needs into `src/levels/data/l2-chase.js` (array of `{ kind, x, y, d }` in authoring `d`, before the `D()` offset) and have `level2.js` loop over it. Keep every other placement as it is.
2. Apply the four L2 edits from the audit.
3. Port `chase-budget.mjs` into a pure helper `tools/audit/chaseModel.js` (export `run`, `budget`) and use it from `tests/chase-budget.test.js`. Derive each stop's needed time from the data (pack wall = 3 bites + lateral moves, stack = 2 bites, zipped = slide 0.2 s, single pack = 0.1 s) with the constants in the audit.
4. Do the same for Roomba Rush: data file, the four stagger edits, `tests/ride-reach.test.js` with the stagger rule `(|dx| − 1.67) / 6.8 × 10.5 + 1`.
5. Check the moved Roomba Rush breakables don't overlap cables, toy piles or legs (look at the surrounding lines in `bonusRide.js`).
6. In L1, fix the trampoline soft-lock from the audit: add a lunchbox step so the d 110 ledge is reachable without the trampoline.

## Tests

- `tests/chase-budget.test.js`: for each L2 checkpoint segment, every stop fits in at most 75% of the simulated budget given the stops before it; and the pre-fix layout (inline fixture) fails, so the test can catch the bug
- `tests/ride-reach.test.js`: every pair of Roomba Rush countables satisfies the stagger rule; the pre-fix layout fails

## Done when

- Both new tests pass and fail on the pre-fix fixtures
- L2 now has 3 Snacks checkpoints and the gate is unchanged
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- L2 from the D(173) checkpoint to the gate: break every backpack (stack, gapped wall, D(270) pack, D(284)/D(288) packs) with the cat chasing; no Mega Bark
- Roomba Rush: ram every backpack, the Zipped Backpack, the Cat and the Vacuum Dock in one run; finish without the missed-backpack rain
- L1: bite the trampoline first, then reach the ledge by the new step

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Fix unreachable breakables in Scratchpost Canyon and Roomba Rush`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

Reviewer, please check:

- the gapped-wall margin is the tightest (1.3×): play it
- the data files are the single source the level reads (no duplicated numbers)
