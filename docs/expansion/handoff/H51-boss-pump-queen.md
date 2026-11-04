# H51: Pump Queen, Moon Jump and the true ending

| | |
| --- | --- |
| Branch | `codex/boss-pump-queen` from the latest `main` |
| Size | XL (split into commits) |
| Needs merged first | H41, H03 |
| Can run alongside | H50 (level side) |
| Unblocks | H62, H63, Moon Ledges in every level |

## Goal

The four-stage true final boss at the end of Level 5, the Moon Jump move and the secret ending.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/bosses-spec.md` 6 (all of it), 1.3 (4 stages), 9 items 3 and 5 (Moon Jump input, PumpPill bounce rule)
- `docs/expansion/rewards-spec.md` 9.3 (secret ending)
- `docs/gameplay-expansion-plan.md` 7.6

## Files

**Change or create:**

- new `src/bosses/pumpQueen.js`
- new `buildBoss5Arena` in `src/levels/level5.js` (coordinate with H50)
- `src/entities/enemies.js` (`PumpPill` bounce rule `11 + 2 × pump`; check the Evil Cone fight still works)
- `src/player/player.js` (Moon Jump: hold slide with the stick neutral 0.6 s, then jump)
- `src/game/game.js` (true-ending branch)
- `src/story/script.js`, `src/audio/songs.js` (`boss5`), `src/config/difficulty.js` (`BOSS.queen`)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Placeholder build (6.1), arena (6.3).
2. Stages 1–4 in order with the chains in 6.6.
3. Moon Jump (6.7) and Moon Ledges (`k.moonLedge` from H04b).
4. Cutscenes, true ending (6.8, rewards spec 9.3).

## Tests

- `tests/difficulty.test.js`: queen harder than titan at every stage, 4 stages
- PumpPill bounce test
- secret ending cases in `good-boy-percent.test.js`

## Done when

- Every checklist item in bosses spec 6.10 played
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- bosses spec 6.10 checklist; the Evil Cone fight once more (PumpPill change)

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add the Pump Queen, Moon Jump and the true ending`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
