# H10: Chomp Chain, end-of-level tally and next-goal hint

| | |
| --- | --- |
| Branch | `codex/chomp-chain-tally` from the latest `main` |
| Size | M |
| Needs merged first | H01 |
| Can run alongside | H11, H12, H20–H23 |
| Unblocks | H61 |

## Goal

Add the Chomp Chain combo (with its Blue Sphere reward), replace the results panel with a count-up tally, and show one next-goal hint after each level and on the map.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 0 (contexts), 1.1–1.2 (session fields, hooks), 2 (Chomp Chain), 7 (tally), 8 (next-goal hint), 14 (interaction matrix), 15 (copy), 16 (new sounds)
- `docs/gameplay-expansion-plan.md` 3.2, 3.7, 3.8

## Files

**Change or create:**

- new `src/game/rewards.js` (`rewardCtx`, chain logic as pure functions)
- `src/game/session.js` (chain state, reset on death and rollback, `k.section` data for hints)
- `src/game/game.js` (`updateComplete`: the tally sequence)
- `src/ui/ui.js` (chain HUD)
- `src/audio/audio.js` (the new sounds in rewards spec 16)
- `src/levels/kit.js` (`k.section` if H04b has not added it yet; coordinate)
- `src/levels/level1.js`, `level2.js`, `level3.js`: `k.section` names for the hint

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Pure chain rules first (`rewards.js`), with tests.
2. Hook breaks and enemy defeats (rewards spec 1.2 table).
3. HUD and the rising-pitch break sound.
4. Tally sequence with the timings in rewards spec 7.2; skippable after the first time.
5. Next-goal hint (rewards spec 8.2) on the results screen and the map panel.
6. Respect every context in rewards spec 0 (trial: counter shows, no sphere).

## Tests

- `tests/rewards.test.js` (new): chain timing (1.1 s window), reset on ground time, sphere once per checkpoint section, trial context
- the hint cases in rewards spec 17 (`bones.test.js` part for `nextGoal`), if H11 has not landed write them here and move later

## Done when

- Chain of 8 in L1's first section drops one sphere; never in a trial
- Tally plays in the order and timings of the spec
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- L1: chain 8 backpacks, watch the sphere; die and check the chain resets; finish and watch the tally; check the hint names a real section
- Run a trial: counter shows, no sphere

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add the Chomp Chain, the count-up tally and the next-goal hint`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
