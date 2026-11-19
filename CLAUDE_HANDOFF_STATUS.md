# Handoff status — `nobu` (branch `claude/happy-pasteur-0dhfzp`)

Implementation of `CLAUDE_HANDOFF_OPTIMIZATION.md`, following `CLAUDE_SESSION_BRIEF.md`.
Each item: **done** (commit), **partial** (what remains), **skipped** (why) or **blocked** (on what).

## Phase 0 — P0 security, data loss, boot

| Item | Status |
| --- | --- |
| §1.1.1 Gate every `hub.bank` / `hub.reportCone` on God Mode | **done** `c0c027e` — all 7 call sites (`game.js` level/goal/bonus clear, `session.js` trial, gauntlet, remix, Cone defeat) go through `src/game/hubRewards.js`; blocked when `save.data.godMode`, `session.godUsed` or God-assisted stats. `hub.submitScore` was already gated. |
| §1.1.2 HUD note in hub sessions | **done** `c0c027e` — GOD MODE badge shows "Hub Tickets & Relics disabled" when `hub.inSession`. |
| §1.1.3 Tests | **done** `c0c027e` — `tests/god-hub-rewards.test.js` (every call site, on/used/stats states, trial score). `tests/remix-session.test.js` updated: it asserted the old behaviour (God-assisted Remix clear banked Tickets). |
| §1.2 `exitToHub()` flushes the cloud save first | **done** `b6ed031` — awaits `save.flush()` raced against 800 ms, then `hub.exit`; double press reuses the same exit. Does not depend on the unmerged SDK keepalive. Tests: `tests/exit-to-hub-flush.test.js`. |
| §1.3.1 Drop `nobu_master` / `nobu_sheet` | **done** `26d28d7` — not loaded and not shipped in `dist/` (`UNUSED` in `src/art/assetTiers.js`, `shipAssets` plugin in `vite.config.js`). Files kept in git: they are the Higgsfield Element source / authoring references (see Repo hygiene). |
| §1.3.2 DOM-only assets URL-only | **done** `26d28d7` — `LAZY` tier: story panels, gallery concepts, map, results/death cards, and character portraits whose picture is only a model's sprite fallback. Verified by instrumenting every `Assets.*` call across title, map, all levels and bosses. Characters used as 3D sprites or as tinted placeholder sources (`small_cat`, `dog_*_free`, `vacuum`, `pill_bot`, `rug`) stay loaded. |
| §1.3.3 `initBoot` / level loading | **partial** `26d28d7` — `initBoot()` (title files only) + `loadRest()` in the background, awaited by `Session.startLevel`, Boss Rush, Kennel and wardrobe. **Remaining:** per-level `loadLevelAssets` / `disposeLevelAssets`. Not done because placeholders and several levels share most models and textures, ids are built dynamically (`dog_${breed}_free`, `bg_level${host}`), and a missed id would silently switch a level to procedural fallback art. Image memory is instead bounded by §1.4. |
| §1.3.4 `victoryPreload` now meaningful | **done** `26d28d7` — the panels it preloads are no longer already decoded at boot. |

## Phase 1 — assets and cold boot

| Item | Status |
| --- | --- |
| §1.4.1 Bake `nobu_tex_fixed.jpg` into `nobu.glb`, drop the runtime swap | **done** `13c3f2c` — swap removed from `src/player/nobuGlb.js`; the jpg is kept as the source (not loaded, not shipped). |
| §1.4.2 Crown: strip NormalGL + ORM, 512² albedo | **done** `13c3f2c` — 3018 KB → 101 KB. |
| §1.4.3 Batch meshopt + WebP + resize, `MeshoptDecoder` wired | **done** `13c3f2c` — `tools/optimize_glbs.mjs` (idempotent). 512² props/enemies/dogs, 1024² Nobu, bosses, `vacuum`/`pill_bot` (Titan/Queen sources) and `sproto_mask` (title close-up). `mecha_bird`, `big_cat`, `evil_cone`, `pill_bot` keep float geometry with no meshopt filters: bosses re-rig them at runtime and int8 normals turned the Pump Queen black (caught in screenshots; `tests/queen-real-model.test.js` now asserts it). 26 GLBs 28.25 MiB → 4.81 MiB. |
| §1.4.4 Combined impact | **done** — `public/assets` 38.35 → 14.90 MiB; `dist/` 39.98 → 15.72 MiB. |
| §2.1 Boot not blocked by hub flushes | **done** `f69d0a1` — `hub.authReady()` resolves once the account is known; boot waits for it, `hub.init()` (which all writes await) still includes the sync and flushes. **Not changed:** the 6 s outer cap stays (the handoff suggested 1.5 s); with the flushes out of the wait only the auth RPC is left, and a shorter cap would let NEW GAME / CONTINUE be chosen before the account's progress is attached. |
| §2.2 Ticket RPC storm | **done** `7915dd4` — one `tickets.balance` read after the chunks instead of one per chunk: a 200-Ticket clear 11 → 2 reads (`tests/earn-balance-reads.test.js`). |
| §2.3.1 Loading-screen floor | **done** `81197ff` — 700 ms floor + 300 ms fade → 150 + 150 ms. |
| §2.3.2 Vendor chunks | **done** `f693374` — `three` (706 KB) and `hub-sdk` (69 KB) chunks; `modern-screenshot` stays lazy. |
| §2.3.2 Lazy `import()` of level/boss modules | **skipped** — `LEVELS` is read synchronously by the map, Kennel, save and goal code, and ~100 tests call `def.build` directly; making builders async is a wide refactor for ~0.3 MB gzip of game code that every player needs within a minute anyway. |
| §2.3.3 Fonts | **done** `08d5371` — stylesheet no longer render-blocking (media switch in `src/main.js`, `crossorigin` kept). Self-hosting not done: it adds third-party font binaries and their licences to the repo; proposed to the owner instead. |

## Phase 2 — multiplayer / online

No items: the `nobu` handoff has no multiplayer section.

## Phase 3 — maintainability (§3)

| Item | Status |
| --- | --- |
| §3.1 Drop the private `hub-outbox` IndexedDB coupling (`openWrites`, `firstOutboxKey`, `forgetOutbox`) | **blocked** — needs the public outbox API of hub-sdk v0.9 (metaverse-hub, unmerged); the brief forbids re-vendoring in this pass. |
| §3.1 Strip `hub-sdk.iife.js` and `dist/realtime/` when re-vendoring | **blocked** — same re-vendor. Neither is bundled today (nothing imports them), so `dist/` is unaffected. |
| §3.2 Warn on a `#t=` visit to a build without `VITE_NAKAMA_SERVER_KEY` | **done** `df14cc0`, `5ddd0e7` — console warning, and the hub status line shows "Hub sign-in unavailable in this build" when init ends without a session (a session saved in the tab still works without a key). Tests in `tests/server-key.test.js`. |
| §3.3 Git LFS for GLBs/textures | **skipped** — an owner decision: it needs LFS on the remote and every clone, and moving existing history would rewrite it. After §1.4 the models are 4.8 MiB. Proposed below. |

## Review

`/code-review` (medium) on `main...HEAD`. Fixed in `e0a5569`: menus stayed live during the 800 ms exit flush; `url()` of a file
that failed to load no longer fell back to procedural art; a deferred alias could stay blank; caps an earn result carries
were spent twice per chunk; abandoned waits wrote into a newer loading bar; the Rush bar went backwards; a dog's sprite fallback
was drawn square; the God badge note did not follow `hub.inSession`. Earlier fix `5ddd0e7`: the missing-key status was set
before init knew the outcome and was overwritten by the exchange flow. Not changed: when the key is missing, init still
redeems the `#t=` ticket (it fails with `auth_failed`); skipping it would break a session saved earlier in the tab.

## Measurements

`npm run build && node tools/measure_boot.mjs --mbps 20 --after-ms 60000` (headless Chromium, SwiftShader, cache disabled,
20 Mbit/s + 40 ms; Google Fonts request counted but not fetched). "Decoded images" = w×h×4 of every image/ImageBitmap decoded.

| Build | Before the title: requests | bytes | decoded images | time to title | After background load |
| --- | --- | --- | --- | --- | --- |
| `main` (`780436f`) | 109 | 40.37 MiB | 100 / 675.8 MiB | 18.5 s | same |
| Phase 0 (`26d28d7`) | 12 | 7.10 MiB | 8 / 63.6 MiB | 5.4 s | 77 req / 35.40 MiB / 565.9 MiB |
| Phase 1 (`08d5371`) | 33 | 5.89 MiB | 22 / 38.6 MiB | 3.2 s | 78 req / 11.37 MiB / 148.9 MiB |
| Final (`e0a5569`) | 33 | 5.90 MiB | 21 / 37.6 MiB | 3.3 s | 78 req / 11.37 MiB / 148.9 MiB |

Phase 1 "before the title" includes background-tier files that finished before the title appeared (the boot tier itself is
smaller); the JS is ~1.7 MB of it. GPU texture uploads at the title: 56.1 → 24.1 MiB.

Visual check (`13c3f2c` vs `26d28d7`): same screenshots; levels within 0.3 % of pixels, title Nobu unchanged, bosses differ by
attack timing only. Visual check (`26d28d7` vs `main`): title, map, all 8 levels and 5 bosses screenshotted in the dev build with a seeded
`Math.random`; L2–L6, cave and map are pixel-identical, the rest differ only by camera/animation timing.

## Checks

| Command | Result |
| --- | --- |
| `npm test` | pass — 164 files, 1726 tests (baseline on `main`: 1685) |
| `npm run build` | pass |
| `npm run lint` | 0 errors; no warnings in files this branch touched |

Everything ran here; no check was skipped. `tools/optimize_glbs.mjs` needs `@gltf-transform/*`, `meshoptimizer` and `sharp`
installed with `npm i --no-save` (not dependencies, like Playwright for `tools/playtest.mjs`).

## Cross-repo follow-ups

- **hub-sdk keepalive flush (metaverse-hub, unmerged):** once re-vendored, `exitToHub()` can pass/feature-detect it; the
  800 ms bounded wait stays as the fallback.
- **hub-sdk v0.9 re-vendor:** then move `src/hub/hubBridge.js` off the private `hub-outbox` store (§3.1) and drop
  `hub-sdk.iife.js` / `dist/realtime/` from `vendor/hub-sdk` (follow `vendor/hub-sdk/VENDOR.md`).
- **Production server (deploy repo):** the font stylesheet now loads as `media=print` switched from `src/main.js`; no inline
  handler, so no CSP change is needed. GLBs now need `EXT_meshopt_compression` and `EXT_texture_webp` support, which three's
  loader has; no server change.

## Repo hygiene (proposed deletions for the owner; nothing deleted)

- `public/assets/models/nobu_tex_fixed.jpg` — now baked into `nobu.glb`; kept as the texture's source, excluded from `dist/`.
- Optional: self-host WOFF2 subsets of Luckiest Guy (Apache-2.0) and Baloo 2 (OFL) to drop the Google Fonts dependency.
- Optional: Git LFS for `public/assets/**/*.{glb,jpg,webp}` (§3.3). The pre-compression GLBs (~28 MiB) stay in history either way.
- `public/assets/nobu/nobu_master.webp`, `public/assets/nobu/nobu_sheet.jpg` — authoring references, no runtime use; now excluded from `dist/`.
- Root `backpack.webp`, `mask.avif` — the owner's source art for `items/backpack*` and `ui/sproto_mask` (README "Your files"); not in the build. Recommend keeping them (or moving them under `tools/` with the README updated), not deleting.
