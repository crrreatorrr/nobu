# H31: Extend Level 2 Scratchpost Canyon (300 → 519 m)

| | |
| --- | --- |
| Branch | `codex/extend-l2` from the latest `main` |
| Size | L |
| Needs merged first | H06, H04a–d, H34, H11, H12 |
| Can run alongside | H30, H32, H33 |
| Unblocks | — |

## Goal

Add Switchbacks, Cardboard Fort, Scratchpost Forest and Yarn Avalanche, two loop detours and 4 dogs, retune the chase, and keep every section 100%-able.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/extended-levels-spec.md` 0, 1, 3 (all of L2, especially 3.3 the chase retune), 7A.1 (chase audit for layout 2), 7A.5, 11.3
- `docs/expansion/golden-bone-audit.md`

## Files

**Change or create:**

- `src/levels/level2.js` and its data file from H06
- `src/bosses/bigCat.js` (`ChaseCat` / `Chaser` numbers in 3.3 only; the `resetChase` Snacks and catch rule)
- `src/config/trials.js` (L2 `LAYOUT = 2`)
- `tests/chase-budget.test.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Shift and straddlers (3.1, 3.2).
2. Chase retune (3.3) and the catch rule.
3. Sections in order, each with its Snacks; check the chase test after each.
4. Detours as loops with their `resetChase` Snacks (3.8, 3.9).

## Tests

- `tests/chase-budget.test.js` passes for every layout-2 segment with margin ≥ 1.3× (extended-levels spec 7A.1)

## Done when

- Every item in extended-levels spec 11.3 played
- A one-run Golden Bone with the cat chasing, no Mega Bark
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- extended-levels spec 11.3

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Extend Scratchpost Canyon and keep every backpack reachable in the chase`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
