# H04d: Kit: box helpers (blink, bounce chain, fall, slide, arrow chain)

| | |
| --- | --- |
| Branch | `codex/kit-box-helpers` from the latest `main` |
| Size | M |
| Needs merged first | H00 |
| Can run alongside | H04a, H04b, H04c |
| Unblocks | H30–H32 final sections, H40, H45, H46, H50 |

## Goal

The timed box helpers every Box Gauntlet uses, the shared beat clock, and the jump maths as a pure module with tests.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/box-gauntlets-spec.md` 0, 1 (jump maths and fairness table), 2 (all five helpers and the shared rules), 6 (tests), 7
- `src/entities/breakables.js` (`Lunchbox`, arrow boxes), `src/player/player.js` (`TUNING`)

## Files

**Change or create:**

- new `src/config/movement.js` (`TUNING` moved here and re-exported from `player.js`)
- new `src/levels/gauntletMath.js` (pure)
- `src/entities/` new box entities and `BeatClock`
- `src/levels/kit.js` (the five helpers, `k.guideArc`)
- `src/story/script.js` (fix the slide-jump tip in `BETWEEN[1]`)
- new `tests/gauntlet-math.test.js`, `tests/gauntlet-patterns.test.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Move `TUNING` with no behaviour change.
2. Pure maths and the pattern validator with tests first.
3. Helpers one per commit, each resetting its group clock on respawn.
4. Build each of the 16 patterns once on a dev strip.

## Tests

- box-gauntlets spec 6.3 and 6.4 cases, including the negative ones

## Done when

- All 16 patterns pass the validator at their tier and play on the dev strip
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Dev strip: every pattern; die mid-pattern and check it restarts from the same phase

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add blink, bounce chain, falling, sliding and arrow-chain boxes`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
