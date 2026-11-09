# H20: Boss system: chain runner, 4-stage evolve, checkpoints, medals, boss DDA

| | |
| --- | --- |
| Branch | `codex/boss-system` from the latest `main` |
| Size | M |
| Needs merged first | H02 |
| Can run alongside | H10–H12 |
| Unblocks | H21, H22, H23, H41, H51 |

## Goal

Shared boss features every boss task needs.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/bosses-spec.md` 0, 1.1–1.8, 7, 8, 9 (conflicts, especially item 1)
- `docs/expansion/rewards-spec.md` 11.4 (boss DDA), 12.2 (medals)
- `src/bosses/common.js`, `src/game/session.js` boss hooks

## Files

**Change or create:**

- `src/bosses/common.js` (chain runner with 0.5 s grace after a hit; evolve for n = 4; generalised `chargeTimes`, `stageNames`)
- new `src/bosses/arena.js` (shared projectiles and arena pieces from bosses spec 1.5)
- `src/player/player.js` (hooks in bosses spec 1.8: cage trap, coned state, `onDash`)
- `src/game/session.js` (phase checkpoints for every boss, boss DDA, medal tracking)
- `src/core/save.js` (`bossMedals`, if H01 did not add it)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Chain runner and tests.
2. 4-stage evolve with no visible change to today's 3-stage bosses.
3. Phase checkpoints: see the owner decision below before turning them on for the Bird and Cat.
4. Boss DDA (3 deaths in a stage: tele +15%, window +0.3 s, start with 1 mask); any DDA-helped attempt can't earn medals.
5. Medals: No-Hit (masks and collar saves count as hits) and Speed.

## Tests

- `tests/difficulty.test.js` stays green
- new `tests/boss-chain.test.js` (pure runner: order, grace after hit, never below `FLOOR`)
- new `tests/boss-medals.test.js`

## Done when

- Today's three fights play the same (with `M2_ON = false`)
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Each boss once; die in stage 2 and check where you respawn

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add the shared boss chain runner, 4-stage evolve, medals and boss DDA`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

## Owner decisions this task needs

- Phase checkpoints for the Bird and Cat (they restart from stage 1 today). The bosses spec turns them on for all bosses, which makes the first two fights a little easier. Ask the owner in the PR; default to on.
