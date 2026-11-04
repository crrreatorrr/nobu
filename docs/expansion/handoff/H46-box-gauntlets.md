# H46: Box Gauntlet stages G1–G3 and Polaroids

| | |
| --- | --- |
| Branch | `codex/box-gauntlets` from the latest `main` |
| Size | L |
| Needs merged first | H04d, H01, H11 (and H40 for the G3 Polaroid spot) |
| Can run alongside | H40–H51 |
| Unblocks | — |

## Goal

Three short timing-only stages, opened by a Polaroid that only a no-death run can collect, with medals and cosmetic rewards.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/box-gauntlets-spec.md` 4 (all of it), 5, 8
- `docs/expansion/rewards-spec.md` 1.3 (`gauntlets`), 9.1 (9 mastery points)

## Files

**Change or create:**

- new `src/levels/gauntlet1.js`, `gauntlet2.js`, `gauntlet3.js`
- `src/entities/secrets.js` (`Polaroid`)
- `src/levels/registry.js` (`g1`, `g2`, `g3`)
- `src/levels/level1.js`, `level3.js`, `level4.js` (one Polaroid each)
- `src/game/game.js` (map presentation)
- `src/story/script.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Polaroid entity: greys out after any death since the level start (box-gauntlets spec 4.6).
2. Stages in order G1, G2, G3, each with 2 checkpoints and the medals.
3. Move Hamper Hop's last bounce to 4.8 m (the spec notes it is over the tier limit at 5.0 m).
4. First clear pays 5 Tickets once (counted in the Ticket budget); packs hold none.

## Tests

- each stage's patterns pass `tests/gauntlet-patterns.test.js` at its tier
- Polaroid rule test (death since level start)

## Done when

- Every item in box-gauntlets spec 8 played
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- box-gauntlets spec 8 checklist; collect a Polaroid, then die before it on another run and check it is grey

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add the three Box Gauntlet stages and their Polaroids`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
