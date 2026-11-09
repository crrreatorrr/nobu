# H33: Extend Roomba Rush and Glowworm Grotto

| | |
| --- | --- |
| Branch | `codex/extend-bonus` from the latest `main` |
| Size | M |
| Needs merged first | H06, H04a–d, H11 |
| Can run alongside | H30–H32 |
| Unblocks | — |

## Goal

Lengthen both bonus stages (301 → 459 m and 241 → 370 m) with new sections, a detour each and +2 dogs each, keeping every ride breakable reachable.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/extended-levels-spec.md` 5, 6, 7A.2, 7A.4, 11.5, 11.6
- `docs/expansion/golden-bone-audit.md` (stagger rule)

## Files

**Change or create:**

- `src/levels/bonusRide.js` and its data file from H06
- `src/levels/bonusCave.js`
- `tests/ride-reach.test.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Roomba Rush: shift, Split (kitchen side holds tickets only), Toy Box Ramps, Tile Slide and Dog-Door Leap, Sofa Summit loop.
2. Grotto: shift, River, Mushroom Bounce Cavern, Crystal Echo, Lumi's Nest Hollow.

## Tests

- `tests/ride-reach.test.js` passes for layout 2

## Done when

- Every item in extended-levels spec 11.5 and 11.6 played
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- extended-levels spec 11.5, 11.6

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Extend Roomba Rush and Glowworm Grotto`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
