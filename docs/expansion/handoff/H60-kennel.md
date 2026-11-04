# H60: Kennel, Pack milestones, Buddy and Sniffer

| | |
| --- | --- |
| Branch | `codex/kennel` from the latest `main` |
| Size | L |
| Needs merged first | H11 |
| Can run alongside | H61 |
| Unblocks | — |

## Goal

The Kennel map node where every freed dog appears, with milestone unlocks (jukebox, Buddy dog, fur tints, gallery, Sniffer hints, Golden Kennel).

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 5 (all of it; thresholds 8 / 16 / 24 / 32 / 42 / all), 2.5 (chain badges), 14, 15
- `docs/gameplay-expansion-plan.md` 3.5

## Files

**Change or create:**

- `src/levels/registry.js` (kennel node)
- `src/game/game.js` (Kennel screen)
- new `src/game/kennel.js` (pure milestone logic in `progress.js` per the spec)
- `src/entities/dogs.js` (stable dog ids, Buddy follower)
- `src/player/` (fur tint)
- `src/audio/` (jukebox)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Stable dog ids (rewards spec 5.2) first, with a migration from today's freed counts if needed.
2. Kennel screen with dancing freed dogs (existing GLBs and clips).
3. Milestones and unlock behaviour (5.3, 5.4); all off in trials and boards.
4. Sniffer (5.5).

## Tests

- milestone and shipped-only threshold cases in rewards spec 17
- dog id stability test

## Done when

- Freeing a dog in any level shows it in the Kennel
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Free 8 dogs: jukebox; 16: Buddy follows in L1 but not in a trial

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add the Kennel with Pack milestones, Buddy and Sniffer`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
