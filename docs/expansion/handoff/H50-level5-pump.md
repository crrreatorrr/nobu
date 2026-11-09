# H50: Level 5 Pump & Dump Pipeline

| | |
| --- | --- |
| Branch | `codex/level5-pump` from the latest `main` |
| Size | XL (split into commits) |
| Needs merged first | H45, H04a–d, H11, H12, H03 |
| Can run alongside | H51 (the boss) |
| Unblocks | H62 |

## Goal

Build Level 5 (about 456 m to the gate, tier 5, target 12–18 first-play deaths) exactly as specified, ending with the side-on Liquidation Line gauntlet.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/new-levels-spec.md` 0, 2, 4 (all of it), 5, 6.2
- `docs/expansion/box-gauntlets-spec.md`
- `docs/expansion/golden-bone-audit.md` (Smog Wave chase rule)

## Files

**Change or create:**

- new `src/levels/level5.js` (the boss arena builder belongs to H51)
- `src/levels/registry.js` (L5 opens when L6 is cleared)
- `src/world/stage.js`, `src/story/script.js`, `src/audio/songs.js` (128 bpm; the market clock syncs to it)
- `src/art/placeholders.js`
- `tests/chase-budget.test.js` (Smog Wave fixture)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Same order as H40.
2. The yellow colored bone and the green path (from L4) per the spec.
3. Re-count the tally and update new-levels spec 4.12.

## Tests

- `tests/registry.test.js`: 6 cleared opens 5
- `tests/level-budget.test.js`
- `tests/chase-budget.test.js`: the Smog Wave passes

## Done when

- Every item in new-levels spec 6.2 played
- A one-run Golden Bone is possible
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- new-levels spec 6.2 checklist

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add Level 5 Pump & Dump Pipeline`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
