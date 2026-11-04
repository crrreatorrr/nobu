# H35: metaverse-hub: v2 trial variants for NOBU

| | |
| --- | --- |
| Branch | `codex/nobu-trial-v2` from the latest `main` |
| Size | S |
| Needs merged first | nothing (separate repo) |
| Can run alongside | H34 |
| Unblocks | H30–H32 posting scores; H70 |

## Goal

In the metaverse-hub repo, accept NOBU trial variants `1v2`, `2v2`, `3v2` with their floors, and show the old variants as Classic.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/extended-levels-spec.md` 8.7
- metaverse-hub `AGENTS.md`, `server/modules/src/leaderboard.ts` (`NOBU_FLOOR_MS`, `variantFor`), `packages/hub-sdk/src/live.ts`

## Files

**Change or create:**

- metaverse-hub: `server/modules/src/leaderboard.ts`, any plaza board display that lists NOBU variants, tests

**Don't touch:**

- deploy or change production (the owner does that)
- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Branch `codex/nobu-trial-v2` in metaverse-hub.
2. Add the three variants with the floors in extended-levels spec 0 (25 700, 26 000, 20 600 ms).
3. Plaza: label variants `1`, `2`, `3` as Classic and the v2 ones as current.
4. Run that repo's checks (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`).
5. Say in the PR which game repos must re-sync `hub-sdk` (NOBU).

## Tests

- metaverse-hub tests for the new variants and floors

## Done when

- The hub accepts `1v2` at 25 700 ms and rejects 25 699
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- None in NOBU; check the plaza board list in the hub dev build

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Accept NOBU v2 trial variants for the extended levels`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

## Owner decisions this task needs

- Deploy order: hub first, then NOBU (`handoff.md`)
