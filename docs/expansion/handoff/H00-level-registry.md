# H00: Level registry

| | |
| --- | --- |
| Branch | `codex/level-registry` from the latest `main` |
| Size | M |
| Needs merged first | nothing |
| Can run alongside | any task that touches other files |
| Unblocks | H01 and every later task |

## Goal

Move the level table out of `session.js` and the map tables out of `game.js` into one registry, so new levels (4, 5, 6, bonus stages, G1–G3) are added in one place. No behaviour change.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/gameplay-expansion-plan.md` 10.1 item 1
- `docs/expansion/rewards-spec.md` 0 (level id conventions, play order 1, 2, 3, 4, 6, 5)
- `src/game/session.js` (`LEVELS`, `LEVEL_NAMES`) and `src/game/game.js` (`MAP_NODES`, `MAP_ORDER`, `BONUS_AFTER`, `mapOpen`)

## Files

**Change or create:**

- new `src/levels/registry.js`: entries `{ id, name, build, arena, Boss, bossKey, theme, bossTheme, bonus, tier, unlock(saveData), mapPos, trial, shipped }`, plus `MAP_ORDER` and helpers `levelDef(id)`, `isOpen(id, data)`, `playOrder()`
- `src/game/session.js`: import from the registry
- `src/game/game.js`: map reads `MAP_ORDER`, node positions and `isOpen` from the registry
- new `tests/registry.test.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Create the registry with today's five entries (1, ride, 2, cave, 3) and today's unlock rules exactly (`mapOpen` logic, `BONUS_AFTER`).
2. Keep `LEVEL_NAMES` exported from `session.js` (re-export) so nothing else breaks.
3. Add `tier` from plan 4.1 (`LEVEL_TIER`) and `shipped: true` for the five; nothing reads them yet.
4. Replace the tables in `game.js` and `session.js` with registry calls.
5. Leave ids as they are: numbers 1–3 and strings `'ride'`, `'cave'`.

## Tests

- `tests/registry.test.js`: ids 1–3 unchanged; unlock chain on fresh, after beating L1, after L2, after L3 matches the old `mapOpen`; bonus unlock by `beaten` or `found`; `MAP_ORDER` equals today's

## Done when

- No behaviour change: same map, same unlocks, same names
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Title → map: walk the nodes; locked and open states match `main`
- Play L1 to the boss gate and the Ride bonus stage once

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Move levels and map nodes into one registry`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
