# H03: Placeholder assets

| | |
| --- | --- |
| Branch | `codex/placeholder-assets` from the latest `main` |
| Size | S |
| Needs merged first | H00 |
| Can run alongside | H02, H04*, H05 |
| Unblocks | H40, H41, H45, H50, H51 |

## Goal

Let code ask for new asset ids (Roomba Titan, Pump Queen, new textures…) that fall back to existing assets with a transform until real art is added.

## Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/gameplay-expansion-plan.md` 9.1 and 9.2
- `docs/expansion/bosses-spec.md` 5.1 and 6.1 (placeholder builds)
- `src/art/assets.js`, `src/art/fallbacks.js`, `public/assets/manifest.json`

## Files

**Change or create:**

- new `src/art/placeholders.js`: `{ newId: { from, scale, tint, rot, opacity } }` for every row in plan 9.2
- `src/art/assets.js`: when an id has no manifest entry or fails to load, use the placeholder
- new `tests/placeholders.test.js`

**Don't touch:**

- `public/assets/` (no new files)
- `tools/build_asset_list.py`
- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

## Steps

1. Write the map from plan 9.2.
2. In `Assets.model` / `Assets.url` / textures: look up the new id first; fall back to `from` and apply scale, tint (material colour multiply on a clone), rotation, opacity.
3. Never mutate the shared source material: clone.
4. Log once per id in dev when a placeholder is used.

## Tests

- `tests/placeholders.test.js`: every `from` id exists in `manifest.json`; no placeholder id collides with a manifest id; transforms are numbers

## Done when

- Asking for `model_roomba_titan` returns a tinted, scaled vacuum; real GLB under that id wins when added
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

## Manual playtest (`npm run dev`)

- Dev console: spawn `model_roomba_titan` and `model_pump_queen` in the L1 arena (dev helper) and look at them

Say in the PR which of these you played and which you could not.

## Checks

```bash
npm ci
npm test
npm run build
```

## PR

Title: `Add placeholder asset ids that fall back to existing art`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
