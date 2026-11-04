# H04c: Kit: chase, detour, dark, rising, and the side and rise cameras

| | |
| --- | --- |
| Branch | `codex/kit-chase-detour-camera` from the latest `main` |
| Size | L |
| Needs merged first | H00 |
| Can run alongside | H04a, H04b, H04d |
| Unblocks | H30–H33, H40, H45, H50 |

## Goal

Generalise the L2 chase into a reusable `Chaser`, and add detours, dark stretches, rising hazards and two camera modes.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/new-levels-spec.md` 1.2, 1.14–1.17
- `docs/expansion/golden-bone-audit.md` (chase rule: stops ≤ 75% of budget; detours on chases are loops only)
- `src/bosses/bigCat.js` `ChaseCat`, `src/camera/camera.js`, `src/levels/bonusCave.js` (darkness)

## Files

**Change or create:**

- new `src/entities/chaser.js` (from `ChaseCat`; `ChaseCat` becomes a thin subclass so L2 behaves exactly the same)
- `src/levels/kit.js` (`k.chase`, `k.detour`, `k.dark`, `k.rising`)
- `src/camera/camera.js` (`'side'`, `'rise'`)
- `tests/chase-budget.test.js` (make the model accept any chase's data)

**Don't touch:**

- L2 placements (H06, H31)
- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Extract `Chaser` with no change to L2's numbers; check with the chase-budget test and a playtest.
2. Detours as new-levels spec 1.16 with the loop rule.
3. Dark and rising (1.14, 1.15), cameras (1.17).

## Tests

- chase-budget test still passes for L2; a second fixture with a model/scale option
- `tests/detour.test.js`: loop rule (exit within 2 m) for chase/ride stretches

## Done when

- L2 plays the same; a dev strip shows a coconut chase, a detour, a dark stretch, rising water and both cameras
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- L2 start to gate; the dev strip

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add a reusable chaser, detours, dark and rising stretches, and side and rise cameras`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
