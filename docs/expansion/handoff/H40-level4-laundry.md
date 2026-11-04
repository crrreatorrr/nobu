# H40: Level 4 Laundry Day

| | |
| --- | --- |
| Branch | `codex/level4-laundry` from the latest `main` |
| Size | XL (split into commits: track and theme, sections 1–7, detours, decor, story) |
| Needs merged first | H04a–d, H11, H12, H03 |
| Can run alongside | H41 (the boss) |
| Unblocks | H45, H46 (G3 Polaroid lives here) |

## Goal

Build Level 4 (about 476 m to the gate, tier 4, target 10–14 first-play deaths) exactly as specified, with two Box Gauntlets, two detours and 7 dogs.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/new-levels-spec.md` 0, 2, 3 (all of it), 5, 6.1
- `docs/expansion/box-gauntlets-spec.md` (the helpers used in the Cereal Box Steps and the Boiler Room; the Polaroid for G3)
- `docs/expansion/golden-bone-audit.md` (rules for the Roomba Stampede chase)

## Files

**Change or create:**

- new `src/levels/level4.js` (the boss arena builder belongs to H41; agree the export name)
- `src/levels/registry.js` (entry in new-levels spec 5.1)
- `src/world/stage.js` (theme 5.2)
- `src/story/script.js` (5.3, 5.4)
- `src/audio/songs.js` (5.6)
- `src/art/placeholders.js` (any ids this level adds)
- `tests/chase-budget.test.js` (Roomba Stampede fixture)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Track and walls (3.1), then sections in order, playtesting each.
2. Keep every placement as written; if a jump fails the reach table (2.2), fix it and note it in the PR.
3. Detours (3.9, 3.10) with the loop rule.
4. Re-count the tally from the real file and update new-levels spec 3.12 in the same PR.

## Tests

- `tests/registry.test.js`: Evil Cone beaten opens 4
- `tests/level-budget.test.js`: L4 under its cap
- `tests/chase-budget.test.js`: the stampede passes

## Done when

- Every item in new-levels spec 6.1 played
- A one-run Golden Bone is possible (play it once)
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- new-levels spec 6.1 checklist
- Golden Bone in one run

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add Level 4 Laundry Day`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

Reviewer, please check:

- the section 7 Box Gauntlet is labelled 'G2' in the spec as a pattern name; don't confuse it with the standalone stage id `g2` (H46)
