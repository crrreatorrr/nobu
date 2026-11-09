# H34: Trial layout versioning (NOBU side)

| | |
| --- | --- |
| Branch | `codex/trial-layout-v2` from the latest `main` |
| Size | M |
| Needs merged first | H01 |
| Can run alongside | H35 |
| Unblocks | H30–H32 |

## Goal

Let extended L1–L3 post to new board variants (`1v2`, `2v2`, `3v2`), keep layout-1 bests as "Classic", and drop unsent layout-1 queue rows.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/extended-levels-spec.md` 8.1–8.6, 8.8, 10
- `src/config/trials.js`, `src/core/save.js`, `src/hub/scoreQueue.js`, `src/hub/hubBridge.js`, `tests/trials-bounds.test.js`, `tests/score-queue.test.js`

## Files

**Change or create:**

- `src/config/trials.js`
- `src/core/save.js` (`trials[level].layout`, `trialsClassic`)
- `src/hub/scoreQueue.js`
- `src/hub/hubBridge.js` (`meta.level` = `'1v2'` …)
- `tests/trials-bounds.test.js`, `tests/score-queue.test.js`, new `tests/trial-layout.test.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Add a `LAYOUT` constant per level (1 until H30–H32 merge; each extension PR sets its level to 2).
2. Follow extended-levels spec 8.2–8.5 exactly.
3. Until the hub has the v2 variants live (H35 deployed), layout-2 runs stay local and are never queued.

## Tests

- extended-levels spec 10 cases for trials, save and the queue

## Done when

- With every `LAYOUT` at 1, nothing changes for players
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Run a trial on L1 with `LAYOUT = 1`: posts as before. Set L1 to 2 locally: the time stays local, the map shows the Classic best

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Version trial layouts so extended levels get new boards`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

## Owner decisions this task needs

- Tell players the L1–L3 boards will reset to new ones when the extended levels ship
