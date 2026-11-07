# Test Lab plan: NOBU, Saviour Dog

Status: this is a plan only; nothing has been built yet. It was written on 7 November 2026 from a read-only pass over `main` at `94ba0e0`.
Implementer: Cursor, on branch `cursor/test-lab`.

## What the lab is for

A page at `/nobu/lab.html` that loads on its own and shows:
- Nobu in every mode, idle variant and death type, with the rigged and classic models side by side;
- every enemy, boss and NPC;
- boss state machines that you can force into any attack or phase;
- every projectile kind and every player ability;
- AABB boxes and coordinates on a flat test stage.

## Owner decisions (7 November 2026, the same for every game repo)

These answers came from the owner's Q&A and apply to every game. Repo-specific sections below may add to them, but never relax them.

1. **A separate page.** The lab is its own HTML entry, `lab.html`, at the root of the built site, with its own JS bundle. The game's `index.html` must not import, link to or preload anything from the lab.
   - Measure the game's load before and after: JS bytes, request count and time to first frame. Put both sets of numbers in the PR. The game's numbers must not change.
2. **A hidden URL in production.** The lab ships in the production build at `lab.html`, relative to the game's base path.
   - Nothing in the game links to it.
   - It has `<meta name="robots" content="noindex,nofollow">`.
   - It must pass every existing production check, including banned-string scans. The repo section lists them.
3. **Desktop browser only:** keyboard and mouse. No touch layout.
4. **Automated QA.** Expose a small automation API on `window.testLab`. Never reuse an existing debug handle name. It needs at least:
   - `list()`, which returns every entity with its id, kind and animations/attacks;
   - `select(id)`;
   - `play(clipOrAttack)`;
   - `step(n)`;
   - `state()`, which returns position, velocity, state, clip, frame and HP;
   - `ready`, a promise that resolves when the current view has finished loading and drawing.

   Add a headless script (Playwright or CDP) that opens `lab.html`, visits every entity and every animation, and fails on console errors, failed requests or a blank canvas. Wire it into the repo's checks where browser checks already exist.
5. **Interaction:**
   - **Playback controls:** play, pause, step ±1 frame or tick, speed from 0.1× to 4×, scrub and loop.
   - **Live sandbox:** drive the character with the game's own controls. Show a live readout of position, velocity, facing, state, current animation and frame.
   - **Overlays:** see item 8.
   - **Spawn and fire:** spawn any enemy or boss; force any boss phase or attack; set HP; freeze AI; give any weapon, item or power-up; fire any attack on demand.
6. **Extras:**
   - **Load-time panel.** For each asset show bytes, fetch ms, decode ms and whether it came from cache; show a total per character. Load each character only when it is selected, never the whole roster up front. Use `PerformanceResourceTiming` plus timing around decode.
   - **Side-by-side compare.** Two entities, or two phases or variants of one entity, on one shared clock.
   - **Share links.** Keep all view state in the URL hash, for example `#tab=anim&id=x&clip=y&frame=12`, so a reload restores the exact view. Add a "Save PNG" button.
7. **No sim edits.** The lab is lab-only code. Do not change gameplay or sim files, or anything that changes a sim fingerprint, server bundle, replay golden or gameplay hash.
   - If the lab needs a private value, such as a collision function the game does not export, mirror it in lab code.
   - Add a unit test that fails when the mirror drifts from the source, for example by comparing outputs on sample inputs.
8. **Overlays show the game's truth plus the art's bounds.** Draw exactly what gameplay uses (hit, hurt and collision shapes; anchors; muzzle and spawn points) in one colour, and the sprite or model bounds in another, so mismatches are obvious. Also draw a grid with world coordinates.
9. **Accepted art only.** The roster lists only art the game currently uses. Pending or archived art may appear only in a tab labelled "Archive (not in game)", never in the sandbox.
10. **Isolation.** The lab never writes the player's real save, never takes tab or writer locks, never initialises the hub and never sends scores or tickets. Use an in-memory save with everything unlocked.
11. **Free-form per repo.** Fit the layout to the game. There is no shared kit across repos.
12. **Branch and PR.** Work on `cursor/test-lab`. It was created from the latest `main` with this plan committed. Commit after each phase below, and open a PR into `main` when done. Never push to `main`. Run every repo check and report any you could not run. A different agent reviews the PR.

## Facts this plan relies on

### Stack and assets
- Three.js 0.186.1 on Vite 8, with one entry point (`index.html` → `src/main.js`).
- The base path is `/play/nobu/` in dev and `/nobu/` in production (`vite.config.js:28-33`).
- Assets are listed in `public/assets/manifest.json` (98 entries). `AssetStore.init` (`src/art/assets.js:27-46`) preloads every texture and every GLB, about 30 MB. **The lab must not call `Assets.init()`.** Add a lab loader that fetches the manifest and loads one GLB on demand. It can reuse `Assets` methods, but must not trigger `init`.
- Missing art falls back to `src/art/fallbacks.js` and `src/art/placeholders.js`. For example, the Roomba Titan reuses the vacuum model scaled 4.5x.

### Nobu
- Nobu has no animation clips. `NobuAnimator` (`src/player/nobuAnim.js:19`) builds a pose every frame from a state object:
  - modes: normal, slide, flop, trapped, dead, victory;
  - idle variants: scratch, yawn, tailChase, lookCam;
  - deaths: flat, cone, rug, angel, fall;
  - fields: biteT, flipT, landT, slideT, glide, zoom, barkT, ride.
- There are two models, the rigged `nobuGlb.js` and the classic `nobuPrims.js`. Gear comes from `src/gear/catalog.js` (5 items) and is drawn by `src/player/accessories.js`.

### Enemies, bosses and NPCs
- Enemies are in `src/entities/enemies.js`: Broccoli, Squirrel, ConeDrone, Vacuum, Mouse, YarnBall, PillBot, PumpPill, LidKnight and Shellback.
- Other enemies live elsewhere: DustBunny, BirdEscort, TitanVacuum, QueenPill, and the chasers ChaseCat and CanyonChase.
- Enemy GLBs play clip 0 through `Assets.animate`. The other models move procedurally (`glbMotion`).
- The bosses are MechaBird, BigCatBoss, EvilCone, RoombaTitan and PumpQueen. All extend `Boss` (`common.js:501`) with `setState`/`beginAttack`, `setStageLook(n)` and phases 1–3 (the Queen has 4). Their difficulty comes from `BOSS[key]` (`config/difficulty.js:26`).
- The state and attack names are listed in the analysis: for example, bird has perch, dive, volley, missiles, laser and ultimate, and cone has barrage, clones, rugpull, vortex and others.
- NPCs: ConedDog in 4 breeds (coned and free), Buddy, Glowworm "Lumi" and SprotoMask.

### Combat and physics
- Projectiles are handled by `Projectiles` (`common.js:88`): feather, cone, hairball, drop, wave, missile, egg, roller, claw, coconut, debris, falling, cage, scratch, cable, slowHomer and wake. There is also `Beam` (`common.js:443`).
- Physics is AABB, using `Solid`/`World` in `src/world/physics.js`.
  - The player body is `{hw:0.3,hd:0.3,h:1.3}`.
  - Entities use `setBox(w,h,d,oy)`, projectiles use a radius `r`, and bite range is `TUNING.BITE_RANGE`.
  - Levels sit on a spline track `(d, lateral)` (`src/world/track.js`).
- Sim and render are not separated, but `tests/boss-runtime.test.js:14-38` runs Player, Boss and World headless with a mock `game`. **That mock `game` is the model for the lab host.**

### Existing dev tools
- Dev strips already exist: `gatedTestStrip.js`, `boxDevStrip.js`, `environmentStrip.js`, and the inline prop strip in `dev.js:43-67`.
- DEV-only hooks: `window.__nobu` (set at `main.js:4-7`) and `window.T` (`src/dev.js:187`), which has go, warp, boss, info, tap, hold and shot.
- **`check-prod-bundle` in metaverse-hub bans the string `__nobu` in hub builds**, so the lab must never use that name.

### Singletons and hub calls
- `Assets`, `save` (localStorage `nobu-saviour-dog-save-v1`), `input`, `audio` and `hub` are all singletons.
- `Session.startLevel` calls `hub.beginAttempt`/`startCarry`. **The lab must stub the hub and use an in-memory save.**

## Owner decisions applied here

- **Overlays:**
  - Game truth: the solid AABBs (static and dynamic), the player body, the bite-range arc, entity `box` volumes, projectile radii, beam lines, the boss's current state and attack label, and track `(d, lateral)` coordinates.
  - Art bounds: each model's `Box3` in a second colour.
- **Boss control:** pick a boss, its phase and its stage look (`setStageLook`), then trigger any attack by name through `beginAttack`. You can also set HP, freeze the state machine, or let it run naturally.
- **Nobu control:** play Nobu with the real controls on the test stage. Toggle every ability on (`player.abilities` override, as in `dev.js:113`) and pick any gear.

## Tabs

1. **Roster.** Cards for Nobu (both models), the enemies, bosses, NPCs and the main breakables and props, grouped. Each card shows the model file, its size and its fallback status.
2. **Nobu poses.** Turntable view. Pick a mode, idle variant, death type, ability pose (slide, flop, glide, bark, bite, double jump) and gear. Scrub the pose with the playback controls. Show the rigged and classic models side by side.
3. **Enemies.** Turntable view with clip 0 or procedural motion. Show the AABB, the state (alive, knocked, squashed, gone), buttons that force each state, and speed.
4. **Bosses.** The boss in its arena kit on a flat stage. Phase and stage-look pickers, an attack list (every attack is a button), HP, freeze, and a telegraph overlay. Nobu can be dropped in to fight it.
5. **Sandbox.** A flat lab strip built with `makeKit`/`makeTrack`, like the existing dev strips.
   - Spawn any enemy, NPC, breakable or projectile at the cursor.
   - Live readout: Nobu's world position, track `d/lateral`, velocity, grounded, mode and current pose fields.
   - Pause, step one frame, and set time scale.
6. **Projectiles.** Fire each projectile kind and the beam from a chosen origin toward a chosen target, with the radius overlay.
7. **Levels.** Load any registry level (`src/levels/registry.js:38`) into the lab host with overlays on, and warp along the track. Read-only: there is no session, so nothing is saved.
8. **Compare** and **Loading**.

## Files

- Add:
  - `lab.html`
  - `src/lab/` (host, loader, UI, overlays)
  - `tests/lab-*.test.js` (Vitest/jsdom): the lab host boots with the mock hub and mock save; every boss accepts every attack name it lists; state is restored from the hash
  - `tools/lab-smoke.mjs`
- Edit:
  - `vite.config.js`: multi-page `build.rollupOptions.input`
  - `README.md`: a short "Test Lab" section
- Do not touch: gameplay files in `src/entities`, `src/player`, `src/levels`, `src/world`, `src/config`, or `vendor/hub-sdk`. If a boss attack can't be forced without an edit, mirror the call in the lab and note it in the PR.

## Phases

1. Skeleton: the entry, a lab host (a `game`-shaped object like the test fixture), an on-demand loader, and load numbers before and after.
2. The Roster, Nobu poses and Enemies tabs.
3. The Bosses tab with forced attacks and phases, plus the Projectiles tab.
4. The Sandbox and Levels tabs, with overlays.
5. Compare, Loading, PNG export, `window.testLab`, the smoke test, the README, and the PR.

## Acceptance

- Opening `/nobu/lab.html` makes no request for any GLB until something is selected.
- Every boss runs every attack it has, in every phase, without errors.
- Nobu plays every mode, idle variant and death.
- The real save key and the hub are never touched. A test asserts this by spying on `localStorage` and the hub stub.
- `npm test` and `npm run build` pass, and the `index.html` bundle is unchanged.

## Cursor prompt

The owner pastes this into Cursor:

```text
You are working in the NOBU repo (crrreatorrr/nobu). Check out the existing branch `cursor/test-lab`. It was created from the latest `main` and already contains `docs/test-lab-plan.md`.

1. Read `AGENTS.md` and `README.md`, then read `docs/test-lab-plan.md` in full. That plan is the spec. It records the owner's answers, so follow it exactly and don't re-ask anything it already settles.
2. Build the Test Lab phase by phase as the plan lays out, and commit after each phase. The lab is a separate, unlinked `lab.html` page with `noindex` and its own bundle. It loads each character only when that character is selected. It ships hidden in the production build.
3. Repo-specific hard rules:
   - Never call `Assets.init()` (it preloads about 30 MB). Load one GLB at a time.
   - Build a lab host object shaped like the mock `game` in `tests/boss-runtime.test.js`. Stub the hub and use an in-memory save. Never use `nobu-saviour-dog-save-v1`.
   - Never use the name `__nobu`; metaverse-hub's production check bans it.
   - Gameplay files are read-only. Force boss attacks and phases through their existing `beginAttack`/`setState`/`setStageLook` calls.
4. Never write the real save, never take tab or writer locks, and never initialise the hub. Use `window.testLab` as the automation handle.
5. When done, run: `npm test`, `npm run build`, and the new `tools/lab-smoke.mjs`. Then open a PR from `cursor/test-lab` into `main` titled "Add Test Lab (lab.html)". In the PR, report:
   - the game page's load numbers (JS bytes, request count, time to first frame) before and after;
   - the result of every check, and any check you could not run, with the reason;
   - every place you mirrored private code, and the drift test that guards it.
6. If part of the plan can only be done by breaking one of these rules, stop and ask me rather than editing a protected file.
```
