# H22: Big Cat: new powers per stage

| | |
| --- | --- |
| Branch | `codex/boss-cat-powers` from the latest `main` |
| Size | M |
| Needs merged first | H20 |
| Can run alongside | H21, H23 |
| Unblocks | — |

## Goal

Add the Big Cat's new power, arena change and ultimate upgrade for each stage.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/bosses-spec.md` 3 (all of it) and 9 item 2 (cat window 2.7 s from M2)
- `docs/gameplay-expansion-plan.md` 7.3

## Files

**Change or create:**

- `src/bosses/bigCat.js` (boss only; don't change `ChaseCat`)
- `src/levels/level2.js` (`buildBoss2Arena`: ledges, crumble ring, catnip)
- `src/bosses/arena.js`
- `src/story/script.js`
- `src/audio/audio.js`

**Don't touch:**

- `ChaseCat` and the L2 chase placements (H06, H31)
- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Laser Pointer (stage 1), Knock It Off the Table + scratch marks (stage 2), Ghost Lives + Catnip + crumble ring (stage 3).
2. Pools as bosses spec 3.3.
3. Turn on the cat's M2 values (window 2.7).

## Tests

- `tests/difficulty.test.js` M2 cases for the cat

## Done when

- Every checklist item in bosses spec 3.7 played
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- bosses spec 3.7 checklist

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Give the Big Cat a new power, arena change and ultimate upgrade per stage`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
