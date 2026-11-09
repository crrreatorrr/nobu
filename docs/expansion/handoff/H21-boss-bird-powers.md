# H21: Mecha Bird: new powers per stage

| | |
| --- | --- |
| Branch | `codex/boss-bird-powers` from the latest `main` |
| Size | M |
| Needs merged first | H20 |
| Can run alongside | H22, H23 |
| Unblocks | — |

## Goal

Add the Mecha Bird's new power, arena change and ultimate upgrade for each stage.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/bosses-spec.md` 2 (all of it)
- `docs/gameplay-expansion-plan.md` 7.2

## Files

**Change or create:**

- `src/bosses/mechaBird.js`
- `src/levels/level1.js` (`buildBoss1Arena`: perches, wind lanes)
- `src/bosses/arena.js` (pieces it needs)
- `src/story/script.js` (copy)
- `src/audio/audio.js` (sounds)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Perch Peck (stage 1), Cage Drop + wind lanes (stage 2), Drone Escort + laser→volley chain + craters (stage 3) as bosses spec 2.2–2.4.
2. Plans as the arrays in bosses spec 2.3.
3. Turn on the bird's M2 values in `difficulty.js`.

## Tests

- `tests/difficulty.test.js` M2 cases for the bird

## Done when

- Every checklist item in bosses spec 2.7 played
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- bosses spec 2.7 checklist; plus once with the Wizard Hat (boss skipped) and once with Classic Nobu

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Give the Mecha Bird a new power, arena change and ultimate upgrade per stage`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
