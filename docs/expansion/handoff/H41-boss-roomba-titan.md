# H41: Roomba Titan and Dust Dash

| | |
| --- | --- |
| Branch | `codex/boss-roomba-titan` from the latest `main` |
| Size | XL (split into commits: model, arena, stage 1, stage 2, stage 3, ultimate, Dust Dash, cutscenes) |
| Needs merged first | H20, H03 (and H23 for the shared vortex) |
| Can run alongside | H40 (level side) |
| Unblocks | H45, H30–H32 Dust Walls |

## Goal

The new boss at the end of Level 4, harder than the Evil Cone, and its reward move Dust Dash.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/bosses-spec.md` 5 (all of it), 1.3, 7
- `docs/gameplay-expansion-plan.md` 7.5, 3.6 (Dust Walls)

## Files

**Change or create:**

- new `src/bosses/roombaTitan.js`
- new `buildBoss4Arena` in `src/levels/level4.js` (coordinate with H40, which creates the file)
- `src/player/player.js` (Dust Dash: bite during a slide)
- `src/game/session.js` / registry (bossKey `titan`)
- `src/story/script.js` (`BOSS_TALK`, intro, defeat, move tutorial)
- `src/audio/songs.js` (`boss4`)
- `src/config/difficulty.js` (`BOSS.titan`)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Placeholder model (bosses spec 5.1) via H03.
2. Arena (5.6).
3. Stages in order with the chains in 5.5; playtest each before the next.
4. Dust Dash (5.7) and the Dust Wall interaction (`k.dustWall` from H04b).
5. Cutscenes and copy (5.8).

## Tests

- `tests/difficulty.test.js`: titan row harder than cone at every stage
- Dust Dash numbers test (speed, duration, cooldown) if pure

## Done when

- Every checklist item in bosses spec 5.10 played
- Wizard Hat still skips it
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- bosses spec 5.10 checklist

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add the Roomba Titan boss and the Dust Dash move`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
