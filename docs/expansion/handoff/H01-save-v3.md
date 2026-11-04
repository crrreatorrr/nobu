# H01: Save v3

| | |
| --- | --- |
| Branch | `codex/save-v3` from the latest `main` |
| Size | M |
| Needs merged first | H00 |
| Can run alongside | any task that touches other files |
| Unblocks | H10, H11, H12, H34, H60, H61 |

## Goal

Move the save to v3: per-level data keyed by level id (so it no longer assumes 3 levels) plus the new fields, with a lossless v2 → v3 migration.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 1.3 (schema), 1.4 (sanitizers), 1.5 (migration step by step), 1.6 (multi-tab merge), 17 `tests/save-migrate.test.js` and `tests/multitab.test.js` additions
- `src/core/save.js` (all of it) and `tests/multitab.test.js`, `tests/save-scores.test.js`

## Files

**Change or create:**

- `src/core/save.js`
- new `tests/save-migrate.test.js`
- `tests/multitab.test.js` (additions)
- every reader of `beaten[i]`, `bones[i]`, `bestDogs[i]` (grep for them; switch to the keyed helpers)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Add the v3 fields with defaults exactly as rewards spec 1.3.
2. Write the sanitizers in 1.4.
3. Write the migration in 1.5; keep the `.corrupt` backup behaviour.
4. Add keyed helpers (`beatenOf(id)`, `setBeaten(id)`, …) and switch the readers.
5. Update the multi-tab merge as in 1.6.
6. Keep `trials` untouched here (layout versioning is H34).

## Tests

- `tests/save-migrate.test.js`: every case listed in rewards spec 17
- `tests/multitab.test.js`: the additions in rewards spec 17
- existing save tests still pass unchanged

## Done when

- A v2 save from `main` loads with nothing lost; a fresh save is v3
- New Game keeps trial bests (and the extra kept fields in rewards spec 18 item 7)
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Load a save made on `main` (copy the localStorage key) and check map, bones, lives, Tickets, trials, wardrobe
- Two tabs: set a trial best in one; the other keeps it

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Move the save to v3 with keyed level data`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

Reviewer, please check:

- migration is lossless and idempotent
- no field is read by index 0..2 any more
