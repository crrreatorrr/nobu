# H45: Level 6 Smog Rapids

| | |
| --- | --- |
| Branch | `codex/level6-rapids` from the latest `main` |
| Size | XL (split into commits: raft, hazards, theme, sections S0–S6, detours, secrets, story) |
| Needs merged first | H40 (Level 4 exists), H04a–d, H11, H12, H03 |
| Can run alongside | H51 |
| Unblocks | H50 (Level 5 opens when Level 6 is cleared) |

## Goal

Build the river level between Level 4 and Level 5: raft rides alternating with on-foot landings, two Box Gauntlets, two loop detours, 7 dogs and a full Bone Board.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/level6-spec.md` (all of it; it is the authoring spec)
- `docs/expansion/golden-bone-audit.md` (ride stagger rule; the raft follows it)
- `docs/expansion/box-gauntlets-spec.md` (the box helpers used in S4 and S6)
- `docs/gameplay-expansion-plan.md` 6.4

## Files

**Change or create:**

- new `src/levels/level6.js`
- new raft code as level6 spec 2 (`k.raft`, `RaftController`, the changes to `src/player/player.js` in 2.4)
- new hazards in level6 spec 3 (`k.whirlpool`, `k.outflow`, `k.slick`, `k.driftLog`, `k.floatPack`, the barrel option on `k.coconuts`)
- `src/world/stage.js` (`river` theme)
- `src/levels/registry.js` (entry in level6 spec 10.1)
- `src/story/script.js`, `src/audio/songs.js` (`level6`)
- `src/art/placeholders.js` (level6 spec 11)
- `tests/ride-reach.test.js` (add the raft breakables) and a new `tests/raft.test.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Raft first, on a test strip, until mount, steer, hop, waterfall gaps, rollback and respawn all work (level6 spec 2.5).
2. Hazards one by one (3.1–3.7).
3. Theme and track (4).
4. Sections S0–S6 in order, playtesting each; keep every placement as written.
5. Detours (6) as loops at y +10.
6. Secrets and the Bone Board (7), tally check (8), trial targets local only (9).
7. Registry, story, tutorials, music (10).

## Tests

- `tests/raft.test.js`: the feasibility table in level6 spec 5.2
- `tests/ride-reach.test.js`: raft breakables obey the stagger rule
- `tests/registry.test.js`: Titan beaten opens 6; 6 cleared opens 5
- `tests/level-budget.test.js`: L6 under its cap

## Done when

- Every item in level6 spec 13 played
- A one-run Golden Bone is possible (play it once)
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- level6 spec 13 checklist
- Golden Bone in one run, both detours included

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add Level 6 Smog Rapids`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

Reviewer, please check:

- raft rollback after a death on a ride
- no countable breakable is placed side by side on a raft stretch
