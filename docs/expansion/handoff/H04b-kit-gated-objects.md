# H04b: Kit: gated objects and pickups (section, pity snacks, mystery, dust wall, moon ledge, smog vent, zoomie gate)

| | |
| --- | --- |
| Branch | `codex/kit-gated-objects` from the latest `main` |
| Size | M |
| Needs merged first | H00 |
| Can run alongside | H04a, H04c, H04d |
| Unblocks | H10 (sections), H12 (mystery), H30–H33, H40, H41, H51 |

## Goal

The helpers that mark sections, add pity checkpoints and gate secrets behind boss moves.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/new-levels-spec.md` 1.1, 1.3–1.8
- `docs/expansion/rewards-spec.md` 6 (move-gated bookkeeping), 3 (mystery), 11 (pity checkpoints come from the DDA)

## Files

**Change or create:**

- `src/levels/kit.js`
- `src/entities/secrets.js` (DustWall, MoonLedge, SmogVent, ZoomieGate, PitySnacks)
- `src/entities/breakables.js` (only if H12 hasn't added `MysteryBackpack`)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Gated objects read the player's moves from the beaten map (rewards spec 6.1); they always look gated (plan 3.6).
2. Pity snacks stay dormant until the DDA turns them on (H05/H12 own the DDA call; add the hook only).
3. `k.section` only records names and ranges here.

## Tests

- gate rule test: a Golden Bone never sits behind a gate (`tests/gates.test.js`, reads level data exports where they exist)

## Done when

- Each object works on the dev test strip with and without its move
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Dev test strip with a fresh save, then with a save that has every boss beaten

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add section markers, pity checkpoints and move-gated objects`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
