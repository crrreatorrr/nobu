# H62: Smog Remixes

| | |
| --- | --- |
| Branch | `codex/smog-remix` from the latest `main` |
| Size | L |
| Needs merged first | H51, H30–H33 |
| Can run alongside | H63 |
| Unblocks | — |

## Goal

Mirrored, smog-filtered, one-tier-harder remixes of every main level with their own Golden Bone, unlocked by beating the Pump Queen.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/gameplay-expansion-plan.md` 4.5
- `docs/expansion/rewards-spec.md` 0 (`remix` context), 12.4

## Files

**Change or create:**

- `src/levels/kit.js` / `src/world/track.js` (`mirror` option: negate `x` and turtle turns)
- `src/game/session.js` (`session.remix`)
- `src/world/stage.js` (smog filter)
- `src/game/game.js` (map toggle)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Mirror option with a test that a mirrored track has the same length.
2. Remix context: tier +1 through `TIER`, no Mystery, no DDA, no Freeze Packs.
3. Remix Golden Bone in the save.

## Tests

- mirror length test; remix bone rule test

## Done when

- Each main level plays mirrored; Golden Bone possible in one run
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- L1 and L2 remix (the chase mirrored), one Golden Bone run

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add Smog Remixes`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
