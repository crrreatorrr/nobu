# H30: Extend Level 1 Bark Jungle (314 → 539 m)

| | |
| --- | --- |
| Branch | `codex/extend-l1` from the latest `main` |
| Size | L |
| Needs merged first | H06, H04a–d, H34, H11, H12 |
| Can run alongside | H31, H32, H33 |
| Unblocks | H46 (G1 Polaroid) |

## Goal

Add Canopy Walk, Coconut Run and Sunken Temple, two detours and 4 dogs to L1, as the extended-levels spec says.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/extended-levels-spec.md` 0, 1 (shift helper, straddlers, detours, checkpoints), 2 (all of L1), 7, 7A.3–7A.5, 11.1–11.2
- `docs/expansion/box-gauntlets-spec.md` 5 (placement checklist)

## Files

**Change or create:**

- new `src/levels/layouts.js` (if not already added by another extension task: shared shift helper)
- `src/levels/level1.js`
- `src/config/trials.js` (L1 `LAYOUT = 2`, new targets)
- `src/story/script.js` (tutorials)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Shift helper and turtle edits (2.1), hand edits for straddlers (2.2).
2. Sections A, B, C, then detours (2.6, 2.7).
3. Dogs, secrets, tally (2.8); re-count from the file.

## Tests

- `tests/chase-budget.test.js`: Coconut Run fixture
- `tests/level-budget.test.js`, `tests/gates.test.js`

## Done when

- Every item in extended-levels spec 11.1–11.2 played
- Old Golden Bones stay earned (8.8)
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- extended-levels spec 11.2; one Golden Bone run

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Extend Bark Jungle with Canopy Walk, Coconut Run and Sunken Temple`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
