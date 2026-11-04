# H32: Extend Level 3 Cone Factory (244 → 419 m)

| | |
| --- | --- |
| Branch | `codex/extend-l3` from the latest `main` |
| Size | L |
| Needs merged first | H06, H04a–d, H34, H11, H12 |
| Can run alongside | H30, H31, H33 |
| Unblocks | H45 (purple path lands here), H46 (G2 Polaroid) |

## Goal

Add Sorting Belts, the 2.5D Packaging Line and Vat Overflow, two detours, 4 dogs and the purple path.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/extended-levels-spec.md` 0, 1, 4 (all of L3), 7A.3–7A.5, 11.4
- `docs/expansion/level6-spec.md` 7.2 (purple path; final d 315–323 per the extended spec)

## Files

**Change or create:**

- `src/levels/level3.js`
- `src/config/trials.js` (L3 `LAYOUT = 2`)
- `src/story/script.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Shift and straddlers (4.1, 4.2).
2. Sections A, B (side camera from H04c), C (rising from H04c, gauntlet from H04d).
3. Detours (4.6, 4.7), purple path (ghost until the purple bone).

## Tests

- `tests/level-budget.test.js`, `tests/gates.test.js`

## Done when

- Every item in extended-levels spec 11.4 played
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- extended-levels spec 11.4

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Extend the Cone Factory with Sorting Belts, Packaging Line and Vat Overflow`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
