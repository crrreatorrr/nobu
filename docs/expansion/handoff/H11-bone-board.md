# H11: Bone Board and Good Boy %

| | |
| --- | --- |
| Branch | `codex/bone-board` from the latest `main` |
| Size | M |
| Needs merged first | H01 |
| Can run alongside | H10, H12, H20–H23 |
| Unblocks | H40, H45, H50, H60 |

## Goal

Six bones per main level (Golden, Good Boy, Hidden, three Snack tiers), three per bonus stage, shown in the pause menu, results and map, plus the Good Boy % completion counter.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 4 (Bone Board), 9 (Good Boy %), 6.3 (Golden Bone never gated), 14, 15, 17 (`bones.test.js`, `good-boy-percent.test.js`)
- `docs/gameplay-expansion-plan.md` 3.4, 3.9

## Files

**Change or create:**

- new `src/game/bones.js` and `src/game/progress.js` (pure)
- `src/game/session.js` (death count for Good Boy, raw ticket count for Snack bones, Hidden Bone pickup saves at once)
- `src/game/game.js` (map panel, results, pause board)
- `src/ui/ui.js`
- `src/entities/secrets.js` (a `HiddenBone` pickup entity, placeholder = `golden_bone` tinted)
- `src/levels/level1.js`–`level3.js`: place one Hidden Bone each (spots in the extended-levels spec; until then a temporary spot noted in a TODO)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Pure rules and tests first.
2. Wire the counters into the session.
3. UI: pause board with silhouettes, results stamp-in (after H10's tally if merged), map panel.
4. Good Boy % on the title/map with the shipped-only denominator (rewards spec 9.1).
5. Golden Bones already earned stay earned (never revoke).

## Tests

- `tests/bones.test.js` and `tests/good-boy-percent.test.js`: all cases in rewards spec 17 (95-point base, floor rule, shipped-only denominator, secret ending)

## Done when

- The board shows for L1–L3 and both bonus stages; existing Golden Bones show as earned
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- L1 with ≤3 deaths: Good Boy Bone; with 4: none
- Collect 40% / 60% / 80% of tickets: snack tiers stamp
- Pick up a Hidden Bone, quit without finishing: it stays

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add the Bone Board and Good Boy %`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
