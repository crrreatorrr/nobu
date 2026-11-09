# H61: Mastery: Platinum Tags, Perfect Run, boss medal list

| | |
| --- | --- |
| Branch | `codex/mastery-ui` from the latest `main` |
| Size | M |
| Needs merged first | H10, H20 |
| Can run alongside | H60 |
| Unblocks | — |

## Goal

Platinum trial tier, the Perfect Run relic and a boss medal list on the map.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 12.1–12.3, 9 (mastery points)
- `src/config/trials.js`, `src/core/save.js` (`sanitizeTrial`)

## Files

**Change or create:**

- `src/config/trials.js` (fourth target)
- `src/core/save.js` (`'platinum'` medal)
- `src/game/game.js` (map: boss list, paw stamps)
- `src/game/session.js` (Perfect Run check)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Platinum as rewards spec 12.1; hub boards stay time-only (no meta change).
2. Perfect Run as 12.3.
3. Boss list with medals (12.2).

## Tests

- `tests/trials-bounds.test.js` additions for platinum
- Perfect Run rule test

## Done when

- A platinum time shows a platinum tag locally and posts the same ms to the hub as before
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Beat L1's trial under the platinum time (god mode off)

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add Platinum Tags, the Perfect Run relic and the boss medal list`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
