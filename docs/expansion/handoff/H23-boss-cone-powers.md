# H23: Evil Cone: new powers per stage

| | |
| --- | --- |
| Branch | `codex/boss-cone-powers` from the latest `main` |
| Size | M |
| Needs merged first | H20 |
| Can run alongside | H21, H22 |
| Unblocks | H41 (shares the vortex and coned-state code) |

## Goal

Add the Evil Cone's new power, arena change and ultimate upgrade for each stage.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/bosses-spec.md` 4 (all of it) and 9 item 4 (pedestal positions)
- `docs/gameplay-expansion-plan.md` 7.4

## Files

**Change or create:**

- `src/bosses/evilCone.js`
- `src/levels/level3.js` (`buildBoss3Arena`: tile grid, pedestals)
- `src/bosses/arena.js`
- `src/player/player.js` (coned state from H20)
- `src/story/script.js`
- `src/audio/audio.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Cone of Shame (stage 1), Rug Pull tiles (stage 2), Smog Tide + chain of 3 (stage 3).
2. Plans as bosses spec 4.3.
3. Turn on the cone's M2 values.

## Tests

- `tests/difficulty.test.js` M2 cases for the cone

## Done when

- Every checklist item in bosses spec 4.7 played
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- bosses spec 4.7 checklist

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Give the Evil Cone a new power, arena change and ultimate upgrade per stage`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
