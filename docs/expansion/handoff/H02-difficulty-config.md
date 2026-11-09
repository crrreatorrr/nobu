# H02: Difficulty config

| | |
| --- | --- |
| Branch | `codex/difficulty-config` from the latest `main` |
| Size | M |
| Needs merged first | H00 |
| Can run alongside | H03, H04*, H05 |
| Unblocks | H20 |

## Goal

Move the difficulty numbers into `src/config/difficulty.js` (level tiers, boss ladder, fairness floor) and read them everywhere, with no change to how anything plays.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/gameplay-expansion-plan.md` 4.1 and 4.2
- `docs/expansion/bosses-spec.md` 1.1 (getters), 7 (ladder test cases 1, 3, 5, 6 are M0), 8 item 1
- `src/bosses/mechaBird.js`, `bigCat.js`, `evilCone.js`, `common.js` (the literals for hp, per-stage hits, speed, punish windows, ult charge)

## Files

**Change or create:**

- new `src/config/difficulty.js` (`LEVEL_TIER`, `TIER`, `BOSS`, `FLOOR`, `M2_ON = false`)
- the three boss files and `common.js`: read hp, perStage, speed, window from `BOSS` through the getters
- new `tests/difficulty.test.js` (the M0 cases)

**Don't touch:**

- any boss attack logic beyond swapping literals for getters
- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Create the file with the tables from plan 4.1 (with `tele = 1` and `chain = 1` for bird, cat, cone until M2 turns them on, as bosses spec 1.1 says).
2. Swap each literal for the getter. Keep a comment with the old literal next to each.
3. Add `TIER` reads only where the plan names them (enemy speed, hazard periods, crumble delay); at tier 1–3 the multipliers must equal today's values, so check each one is 1.0 for today's levels or leave TIER unread until H04/H30.

## Tests

- `tests/difficulty.test.js` M0 cases (bosses spec 7): table monotonic, fairness floor, and 'M0 values equal the old literals'

## Done when

- Every boss number that moved has a test proving it equals the old literal
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Fight all three bosses once; nothing feels different

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Move difficulty numbers into config/difficulty.js`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
