# H04a: Kit: gameplay props (spin drum, zipline, toaster, market platforms, rug pull)

| | |
| --- | --- |
| Branch | `codex/kit-gameplay-props` from the latest `main` |
| Size | L |
| Needs merged first | H00 |
| Can run alongside | H04b, H04c, H04d, H02, H03, H05 |
| Unblocks | H30–H33, H40, H50 |

## Goal

Add the moving and timed props the new and extended levels need, each with rollback on death.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/new-levels-spec.md` 1.0 (conventions), 1.9–1.13, 1.18 (extra options), 2 (spans versus Solids, jump reach)
- `src/entities/props.js`, `src/world/physics.js`, `src/levels/kit.js`

## Files

**Change or create:**

- `src/entities/props.js` (or new `src/entities/props2.js` if `props.js` grows past ~1000 lines)
- `src/levels/kit.js` (`k.spinDrum`, `k.zipline`, `k.toaster`, `k.market` + `MarketClock`, `k.rugPull`)
- a dev-only test strip level in `src/dev.js` that places one of each

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. One prop per commit, each with the exact defaults and behaviour in its spec section.
2. Every prop resets in `onRespawn` as new-levels spec 1.0 says.
3. No per-frame allocations (reuse vectors, as the boss code does since `a65687e`).

## Tests

- pure tests for the timing maths: `MarketClock` phase and the toaster cycle (new `tests/props-timing.test.js`)

## Done when

- Each prop works on the dev test strip, including death and respawn mid-cycle
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Dev test strip: ride the drum, zipline, toaster, market platforms and rug pull; die on each and respawn

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add spin drum, zipline, toaster, market platform and rug pull props`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
