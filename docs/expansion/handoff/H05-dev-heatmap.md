# H05: Dev tools: death heatmap and section timers

| | |
| --- | --- |
| Branch | `codex/dev-heatmap` from the latest `main` |
| Size | S |
| Needs merged first | H00 |
| Can run alongside | H02, H03, H04* |
| Unblocks | tuning in every level task |

## Goal

Record where and how players die and how long each section takes, in dev builds only, to tune difficulty.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 13 (heatmap, section timers, playtest protocol)
- `src/dev.js`, `src/main.js`

## Files

**Change or create:**

- `src/dev.js`
- `src/game/session.js` (one dev-only hook in the death path and one per section change, guarded by `import.meta.env.DEV`)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Follow rewards spec 13.1 and 13.2 exactly.
2. Overlay with `?heatmap` in the URL.
3. Make sure the production build tree-shakes it (check `dist/` for the strings).

## Tests

- a small pure test for the record/merge helpers if you add any

## Done when

- `npm run build` output contains no heatmap code
- Overlay shows dots after a few deaths in L1
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Die a few times in L1 with `?heatmap`; reload; dots persist

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add a dev-only death heatmap and section timers`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
