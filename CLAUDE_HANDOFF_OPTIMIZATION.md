# Claude Code Implementation Handoff — `nobu` (`NOBU: Saviour Dog`)

**Branch:** `claude/asset-load-and-security-handoff`  
**Scope:** Close the **God Mode Hub Ticket & `cones_tip` Relic exploit**, fix the **`exitToHub()` cloud-save data-loss bug**, cut blocking cold-boot payload by **>95%** (**38.3 MB / 98 reqs → <1.5 MB / ~8 reqs**) and decoded VRAM from **~900 MiB → <120 MiB**, compress all 26 uncompressed 2K-textured GLBs (**39 MB → ~5–8 MB**), eliminate the 6-second boot hub-flush stall and 20-RPC ticket chunk storm, and clean up duplicated hub outbox glue.

---

## 0. Hard Invariants (`AGENTS.md`)

- Preserve PS1-era visual aesthetic, all 6 main levels, 2 bonus levels, 3 box gauntlets, 5 bosses, Time Trials (`nobu_trial_time`), and all 5 inbound Relic gear unlocks (`tinubu_crown`, `breakwater_coin`, `tidebreaker_belt`, `genesis_shard`, `hpos10i_core`).
- Never push directly to `main`; open a PR after running `npm test` and `npm run build`.

---

## 1. P0 — Security Exploit, Data-Loss Bug & Critical Asset/Boot Overhaul

### 1.1 Block Hub Tickets & `cones_tip` Relic in God Mode (Economy Exploit Fix)
- **Files:** `src/game/session.js:435-442, 535, 554, 803`, `src/game/game.js:401, 815, 1166, 1180, 1252`
- **Current Problem:** `GOD MODE: ON/OFF` (invulnerability + 4 air jumps) is exposed directly on the Title Screen (`game.js:401`) and mid-level hotkey (`toggleGod()`, line `815`). While Time Trials properly check `godUsed` before calling `hub.submitScore()` (`session.js:435-442`), **neither `hub.reportCone()` (`session.js:803`) nor ANY `hub.bank()` call (`game.js:1166,1180,1252`; `session.js:441,535,554`) checks `godUsed` or `save.data.godMode`**! Any player can enable God Mode to farm Hub Tickets (→ Verse) and unlock the permanent cross-game `cones_tip` Relic.
- **Exact Changes:**
  1. Gate **every** `hub.bank(...)` call and `hub.reportCone(...)` call on `!session.godUsed && !save.data.godMode` (mirroring `hub.submitScore()`).
  2. When God Mode is active during a hub session, display a clear HUD indicator (`GOD MODE — Hub Tickets & Relics disabled`) so player expectations are transparent.
  3. Add Vitest unit tests verifying zero `hub.bank` / `hub.reportCone` / `hub.submitScore` calls fire when `godMode` or `godUsed` is true.

### 1.2 Fix `exitToHub()` Cloud-Save Data Loss Bug
- **Files:** `src/game/game.js:749-757`, `src/core/save.js:501`
- **Current Problem:** `@metaverse/hub-sdk`'s `createProgressStore` debounces `save.put` by `1,500 ms` (`vendor/hub-sdk/dist/progress.js:26`). `Game.exitToHub()` (`game.js:749-757`) immediately invokes `hub.exit('exit_to_hub')`, which clears `sessionStorage`, sends `session.close`, and navigates away **without awaiting `save.flush()`**—silently dropping any progress earned within the last 1.5 s before clicking Exit!
- **Exact Changes:**
  1. Make `Game.exitToHub()` `async` and await `Promise.race([this.save.flush(), new Promise((r) => setTimeout(r, 800))])` (plus `keepalive` once `hub-sdk` v0.9 adds it) **before** calling `hub.exit('exit_to_hub')`.
  2. Guard against double-clicks while flushing.

### 1.3 Replace Global 98-Asset Boot Preload (38.3 MiB / ~900 MiB VRAM) With Tiered Lazy Loading
- **Files:** `src/art/assets.js:27-45`, `src/game/game.js:168-174`, `src/game/session.js:231-280`, `src/game/victoryPreload.js`, `public/assets/manifest.json`
- **Current Problem:** `AssetStore.init()` (`src/art/assets.js:27-45`) fetches `manifest.json` (`cache: 'no-cache'`) and runs `Promise.all` over **ALL 72 non-GLB textures + ALL 25 `model_*.glb` + hardcoded `models/nobu.glb`** = **98 concurrent HTTP requests totaling 38.29 MiB** (decoding to **~675.8 MiB base / ~900.8 MiB with mipmaps** held forever!) before the Title Screen renders:
  - The Title Screen only needs **8 files** (`nobu.glb`, `sproto_mask.glb`, `bg_title.jpg`, `logo`, `tex_l1_ground`, `sproto_mask`, `textbox` — and after §1.4, `nobu_tex_fixed.jpg` is baked into `nobu.glb`).
  - **26 DOM-only images** (7 of 8 `story/*.jpg` = 2.25 MiB, 19 of 21 `characters/*.webp` = 1.79 MiB) are only rendered via DOM `<img>`/CSS (`Assets.url()`), yet `AssetStore.init()` uploads every one into `THREE.Texture`!
  - **2 dead files** (`nobu_master.webp` 61 KB, `nobu_sheet.jpg` 128 KB) are listed in `manifest.json` and uploaded to WebGL with zero references in `src/`.
- **Exact Changes:**
  1. Remove `nobu_master.webp` and `nobu_sheet.jpg` from `public/assets/manifest.json` and delete the files (also delete stray root files `backpack.webp` and `mask.avif`, or move them to `tools/`).
  2. Mark DOM-only assets (`story/*`, `characters/*`, `ui/concept_*`, `backgrounds/level_map`) as URL-only in `manifest.json` so `AssetStore` **never** loads them through `THREE.TextureLoader`.
  3. Split `AssetStore` into:
     - `initBoot()`: loads ONLY Title Screen essentials (7–8 files).
     - `loadLevelAssets(levelId)`: loads ONLY the GLBs & textures required by that level/boss during `Session.startLevel()` (and `loadWardrobeAssets()` on wardrobe open for Relic cosmetics like `nobu_champions_crown.glb`).
     - `disposeLevelAssets(levelId)`: disposes unused level-specific textures/geometries on level exit so VRAM stays bounded.
  4. Now `src/game/victoryPreload.js` actually does its intended lazy background preload during boss fights!

### 1.4 Optimize All 26 Uncompressed GLBs (28.25 MiB → ~4–6 MiB)
- **Files:** `public/assets/models/*.glb`, `public/assets/models/nobu_tex_fixed.jpg`, `src/player/nobuGlb.js:44-46`, `src/art/assets.js:57`, `tools/`
- **Current Problem:** Every single one of the 26 GLBs has **`extensionsUsed: NONE`** (zero Draco/Meshopt/WebP) and embeds **`2048×2048` textures** even on tiny props/enemies (`mouse.glb`, `squirrel.glb`, `trampoline.glb`, 8× `dog_*_{coned,free}.glb` = 7.83 MiB):
  - **`nobu.glb` (3.42 MiB)** embeds a **2,182 KB `2048×2048` JPEG that `src/player/nobuGlb.js:44-46` throws away at runtime** (without calling `.dispose()`!) and replaces with `nobu_tex_fixed.jpg` (622 KB)!
  - **`nobu_champions_crown.glb` (2.95 MiB)** (an optional Relic hat!) embeds **three 2K textures (2,830 KB)**: `Color` (609 KB), `ORM` (377 KB), and an **uncompressed 1,843 KB PNG `NormalGL`** — even though `src/art/assets.js:57` overrides every loaded model to matte (`roughness = 0.9; metalness = 0; envMapIntensity = 0`)!
- **Exact Changes:**
  1. Re-bake `nobu_tex_fixed.jpg` directly into `nobu.glb` (delete `nobu_tex_fixed.jpg` and remove the runtime texture swap in `src/player/nobuGlb.js:44-46` — saves 2.18 MB dead texture + 1 HTTP request + leaks).
  2. Strip `NormalGL` (1.84 MB PNG) and `ORM` (377 KB) from `nobu_champions_crown.glb` and resize its albedo to `512×512` WebP (**2.95 MiB → ~150 KB**).
  3. Batch-optimize all 26 GLBs via `gltf-transform` (`meshopt` + `webp`, resizing tiny prop/enemy/dog textures from `2048×2048` → `512×512` and Nobu/boss textures → `1024×1024`, wiring `MeshoptDecoder` in `src/art/assets.js`).
  4. **Combined Impact:** `public/assets/` shrinks from **39 MB → ~5–8 MB** (~80–85% smaller); cold boot drops from **38.3 MB → <1.5 MB**; decoded VRAM drops from **~900 MiB → <120 MiB**.

---

## 2. P1 — Hub-to-Game Transition Speed, RPC Storm & Code Splitting

### 2.1 Unblock Boot from Hub Outbox/Score Flushes (Eliminate 6-Second Warm-Cache Stall)
- **Files:** `src/game/game.js:168-174`, `src/hub/hubBridge.js:778-826`
- **Current Problem:** `Game.boot()` waits up to **6,000 ms** on `hubReady`, which does NOT resolve after auth — `HubBridge._doInit()` sequentially awaits `sdk.init('nobu')` (which drains origin-shared `hub-outbox`) → `_syncTicketAccount()` → `flush()` → `flushScores()`. On warm browser cache, the loading bar stalls at 100% waiting on background flushes!
- **Exact Changes:**
  1. Split `HubBridge._doInit()` into two phases:
     - **Fast boot promise (`hubAuthReady`):** resolves immediately after `authenticateCustom` + `profile.get` (capped at `1,500 ms` race) so relics/account chip hydrate promptly.
     - **Background sync (`_syncTicketAccount()`, `flush()`, `flushScores()`):** fire-and-forget asynchronously after the Title Screen is interactive.

### 2.2 Halve Ticket Earn HTTP RPC Storm (20 → 10 Sequential RPCs)
- **File:** `src/hub/hubBridge.js:1447-1461`
- **Current Problem:** `_sendEarn()` chunks earns into 20-Ticket batches (`LEVEL_END_MAX_AMOUNT = 20`) and calls `await this._syncTicketAccount(result)` (`tickets.balance` RPC) **after every single chunk** — turning a 200-Ticket clear into **20 sequential HTTP RPCs**!
- **Exact Changes:** Update cached balance/caps from each `earnTickets` response during the chunk loop and call `_syncTicketAccount()` **at most once after the loop completes** (halves round-trips immediately).

### 2.3 Remove Artificial 1,000 ms Level-Load Delay & Add Vite Code-Splitting
- **Files:** `src/ui/ui.js:151-160`, `vite.config.js`, `src/levels/registry.js:1-32`, `index.html:9`
- **Exact Changes:**
  1. Reduce `UI.hideLoading(700)` (`src/ui/ui.js:151-160`) from a 700 ms floor + 300 ms fade (**1,000 ms artificial stall** on every level entry) to `minMs = 150` + `150 ms` fade.
  2. Add `build.rollupOptions.output.manualChunks` in `vite.config.js` splitting `three` and `hub-sdk` into cached vendor chunks, and switch `src/levels/registry.js:1-32` to lazy `import()` level & boss modules on demand.
  3. Self-host WOFF2 subsets of `Luckiest Guy` and `Baloo 2` (or make `index.html:9` Google Fonts non-render-blocking, preserving `crossorigin="anonymous"` if kept external).

---

## 3. P2 — Maintainability, SDK Coupling & Git Repo Hygiene

1. **Remove Private `hub-outbox` IndexedDB Coupling (`src/hub/hubBridge.js:606-685`):** Stop directly opening and deleting rows inside `@metaverse/hub-sdk`'s private `hub-outbox` IDB store (`openWrites`, `firstOutboxKey`, `forgetOutbox`). Consolidate retry/outbox logic onto the public SDK v0.9 API once `metaverse-hub` releases it, and strip unused `hub-sdk.iife.js` (242 KB) + `dist/realtime/` from `vendor/hub-sdk` when re-vendoring.
2. **Surface Missing `VITE_NAKAMA_SERVER_KEY` Clearly (`src/hub/hubBridge.js:39-49`):** Log a clear warning / status banner if a production portal visit arrives with `#t=` but `VITE_NAKAMA_SERVER_KEY` is empty, rather than silently dropping to standalone mode.
3. **Adopt Git LFS for Binary GLBs/Textures:** `.git/` is 37 MB even at `--depth 1`; track `public/assets/models/*.glb` with Git LFS once GLBs are compressed.

---

## 4. Verification Checklist

Run before opening PR (from `AGENTS.md`):
```bash
npm test
npm run build
```
Verify explicitly:
- God Mode unit/e2e tests confirm 0 Hub Tickets and 0 `cones_tip` Relic events sent when `godMode` or `godUsed` is active.
- Cold boot to Title Screen downloads **<1.5 MB / ≤10 requests** (down from 38.3 MB / 98 requests) and peak decoded texture memory stays **<150 MiB** (down from ~900 MiB).
- `exitToHub()` completes `save.put` before `session.close` fires.
