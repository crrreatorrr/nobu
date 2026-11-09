# NOBU: Saviour Dog

A PS1-era-style 3D platformer in Three.js (no engine) with $Bitcoin meme lore. Nobu, a white Akita,
rescues **54 dogs** across six main levels and two bonus stages, confronts five bosses and returns
with new moves to uncover the island's secrets.

```bash
npm ci
npm run dev
```

Open the printed URL, normally **http://localhost:5173/play/nobu/**. `npm run build` creates the
static production build in `dist/`; `npm test` runs the automated checks.

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move | Arrows / WASD | Left stick / D-pad |
| Jump; press again for Double Jump | Space | A |
| Bite | J / Shift | X / RB |
| Slide on ground; Belly Flop in air | K / Ctrl | B / LB / triggers |
| Mega Bark, once unlocked | L / E | Y |
| Clown Collar air dash, when equipped | U | LT |
| Pause | Esc / P | Start |
| Map: time trial on a beaten level | T | Y |
| Map: Box Gauntlet on its unlocked host level | G | RB |
| Map: toggle Smog Remix after the Queen | R | RT |
| Map: wardrobe | I | LB |

Movement is camera-relative. In Scratchpost Canyon's front-facing chase, hold **Down / S** to run
away from the cat. `K` avoids browser shortcuts such as Ctrl+W. With the Clown Collar equipped,
LT spends an available air dash instead of starting a Belly Flop; B/LB/RT remain slide/flop inputs.

| Earned move | Unlock | Input |
| --- | --- | --- |
| Tail Glide | Mecha Bird | Once out of air jumps, press Jump again and hold it to descend slowly. |
| Zoomies | Big Cat | Slide, then keep holding Slide to sprint. |
| Mega Bark | Evil Cone | L / E / pad Y; opens Bark Rocks and clears Smog Vents. |
| Dust Dash | Roomba Titan | Start a ground slide, then press Bite before the slide ends. Breaks Dust Walls. |
| Moon Jump | Pump Queen | Stand still and hold Slide for **0.6 seconds**. Keep Slide held while pressing Jump; a normal air jump can follow. |

The Champion's Crown adds a third jump. God Mode gives a ground jump plus three air jumps; the
Crown does not add another on top of those.

## Main route and bosses

The story order is **1 → 2 → 3 → 4 → 6 → 5**. Smog Rapids has a level goal instead of a boss.

| Level | Stage | Finish |
| --- | --- | --- |
| 1 | Bark Jungle | Mecha Bird |
| 2 | Scratchpost Canyon | Big Cat |
| 3 | The Cone Factory | Evil Cone |
| 4 | Laundry Day | Roomba Titan |
| 6 | Smog Rapids | Reach the Pipeline; steer and hop a drifting raft. |
| 5 | Pump & Dump Pipeline | Pump Queen |

Bird, Cat, Cone and Titan each have three evolving stages; the Queen has four. Attacks use
animation, sound and arena tells rather than on-screen attack countdowns. Bird/Cat retries restart
at stage 1; ordinary Cone/Titan/Queen fights resume at the current stage. Earned Mega Bark still
works on bosses that explicitly accept it, including while wearing a Wizard Hat.

Two optional bonus stages open after the first two bosses: **Roomba Rush** after Bird, and
**Glowworm Grotto** after Cat. Roomba Rush's vacuum drives itself: steer, hop, ram backpacks and
dodge hazards; its Sofa bonus loop is explored on foot. In the Grotto, Lumi lights the route and
recharges at glow nests. Secret warps can reveal these bonus stages early.

## How to play and return visits

- Bite, slide, stomp and Belly Flop through backpacks; free coned dogs and reach Snacks checkpoints.
  Death rolls back pickups and rescues since the checkpoint. A missed-backpack rain at the gate helps
  recover skipped breakables before the boss or goal result.
- Each ordinary stage has a bone board: **Golden** for all counted breakables and all dogs in one run,
  **Good Boy** for reaching the gate with at most three deaths, **Hidden** for its secret, and up to
  three **Snack Bones** at 40/60/80% of the eligible snack supply. Bonus stages omit Snack tiers.
  Later moves unlock optional secrets; they are not required for the ordinary Golden route.
- **Perfect Run** records require all breakables and dogs with zero deaths at the gate. Chomp Chains
  reward quick consecutive hits; a chain of 15 earns a badge. Bones and chain milestones do not add
  Ticket payouts. Good Boy paw routes and Treat Tray sky rounds offer optional rewards; falling out
  of a Treat Tray round loses its haul without costing a life.
- Replay with Dust Dash, Glide, Bark and Moon Jump. Moon platforms are permanent geometry, and some
  rewards require the earned jump height. The Pipeline's Hidden Bone is a post-Queen return reward.
- Five colored bones make their matching ghost paths solid:

  | Bone | Found in | Opens paths in |
  | --- | --- | --- |
  | Red | Glowworm Grotto | Bark Jungle |
  | Blue | Cone Factory fan catwalk | Scratchpost Canyon |
  | Green | Laundry Day | Pipeline and Bark Jungle |
  | Purple | Smog Rapids | Cone Factory |
  | Yellow | Pipeline | Scratchpost Canyon |

Breakable variants include Blue Spheres (Sproto Masks), 1UP heads, Trampolines, Snacks checkpoints,
Cats with a 3–2–1 fuse, explosive Rugs, three-hit Zipped Backpacks, Mystery Backpacks, Lint Roller
and Vacuum Dock switches, and unbreakable Lunchbox steps/arrow launchers. Timed Blink/Fall/Slide/Arrow
boxes, Pump Stones, market platforms, drums, ziplines, fans, conveyors and rising hazards add new routes.

A Sproto Mask absorbs a hit; two give a gold aura; three give about 20 seconds of invincibility.
Normal checkpoints can offer masks, slower hazards and Pity checkpoints after repeated deaths.
That checkpoint assistance is disabled in trials, Remix and Boss Rush.

## Kennel, Box Gauntlets and post-game modes

The Kennel opens after a rescued dog is banked in ordinary progress. Its milestones use unique
rescues across all eight stages:

| Dogs rescued | Unlock |
| --- | --- |
| 8 | Jukebox |
| 16 | Cosmetic Buddy, chosen from rescued breeds |
| 24 | Fur tints |
| 32 | Art gallery |
| 42 | Sniffer hints for missing dogs and Hidden Bones |
| All 54 | Golden Kennel scene |

The Buddy follows ordinary on-foot field play; it does not fight, collect items or appear in bosses,
trials, Remix, Rush, mounted sections or Treat Tray rounds. Five Chomp Chain badges also unlock the
Chomp Gold tint. In the Kennel, use directions to choose, Jump/Enter to select, Bark for Sniffer and
Esc/Back to return; on the map, Bark also opens Sniffer once unlocked.

**Box Gauntlets:** find a Polaroid in a deathless normal visit to L1, L3 or L4 to unlock **Jungle
Crates**, **Assembly Rush** or **Hamper Hop**. Select that host on the map and press G/RB. Earn Clear,
All Boxes and Flawless medals; Flawless requires every counted box and zero deaths. The first eligible
clear pays **5 Tickets once per Gauntlet**, with no repeat-clear farming. Medals also unlock cosmetic
collars, finishes or trails, and cleared courses appear on the Kennel photo wall. God-assisted and
competitive-mode attempts cannot unlock Polaroids or earn Gauntlet records/rewards.

After defeating the Queen:

- **Cone Gauntlet (Boss Rush):** select its map pin and press Jump/Enter. Fight Bird → Cat → Cone →
  Titan → Queen. Masks carry between bosses, deaths clear masks and restart the current boss from
  stage 1, and retries are unlimited without spending lives. Earn a Clear medal, No-Hit medal and
  local best time. Rush provides no field Ticket haul, ordinary bone board or ordinary boss medals.
- **Smog Remix:** select a main level and toggle R/RT before starting. The course is mirrored, field
  enemies use the next difficulty tier, and assistance is disabled. Break every counted backpack and
  rescue every dog in one run, then defeat the retained boss (or finish the Rapids goal) for that
  level's separate Remix Golden Bone. Remix does not overwrite ordinary dog, bone, story or trial
  progress; New Game clears Remix records.

**God Mode** is a saved title-menu toggle: damage is ignored, falls recover to recent solid ground,
and extra jumps make practice easier. It can still advance ordinary story progress, but cannot earn
Good Boy Bones, Perfect Runs, boss medals, Rush records, Remix Golden Bones, Gauntlet records/rewards,
trial Platinum tags or public scores. Ordinary boss assistance also voids boss medals. Practice trial
bests can remain local, with eligibility tracked separately from clean records. Under the badge, a HITS · DEATHS
tally counts what God Mode absorbed this level (a death is a pit, a crusher, or a hit with no mask
or collar charge left). It resets each level and is never saved or scored.

## Time trials and public-board status

Press T/pad Y on a beaten main level. Trials finish at the boss gate or stage goal, cost no lives
on death, disable gear effects and retain earned story moves. Freeze Packs pause the clock for
1–3 seconds **once per pack per attempt**; dying does not restore consumed time credit. Trials have
Bronze/Silver/Gold tags and an eligible Platinum target.

The current extended L1–3 layouts are **layout 2**; previous layout-1 records are retained separately
as **Classic**. All six main levels keep local bests and support eligible public submissions to
`nobu_trial_time`: variants `1v2`, `2v2`, `3v2`, `4`, `6` and `5`. This client gate must ship only
after the owner confirms the matching hub deployment and the SDK is synchronized; merging server
code alone does not deploy or enable the boards. Classic records remain archived separately.

Client validation floors, in seconds, are:

| Layout | L1 | L2 | L3 | L4 | L6 | L5 |
| --- | --- | --- | --- | --- | --- | --- |
| Classic layout 1 | 15 | 15 | 12 | — | — | — |
| Current layouts | 25.7 | 26 | 20.6 | 24 | 30 | 21 |

The ceiling is 30 minutes. These bounds are separate from medal targets; source values live in
`src/config/trials.js`. Public submission, when enabled, also requires a hub player session and an
eligible run. Standalone times are never uploaded retroactively. Eligible score-queue rows remain
scoped to player and variant, with network retries; an accepted acknowledgement confirms the board
holds that time or a better one.
The map can show Classic records and a total of all six current trial bests once each exists.

## Saves and New Game

The local save is **version 3**, under the existing `nobu-saviour-dog-save-v1` key. Older saves migrate
without renaming released dog IDs; previous trial layouts are archived as Classic. Unreadable data is
backed up at `nobu-saviour-dog-save-v1.corrupt`. Cross-tab writes merge durable records rather than
replacing faster times or earned progress with older copies.

**New Game resets story unlocks, rescues, ordinary bone boards, colors and Remix progress.** It keeps
current/Classic trial records, boss medals, Perfect Runs, Rush records and Gauntlet progress, including
its one-time reward claims. Model/render/audio preferences, God Mode and equipped-item choices also
remain. Start with God Mode off when pursuing eligible records.

## Wardrobe and hub items

A Relic earned in another hub game unlocks one NOBU item. Open it from the
title, the map (`I` / LB) or the pause menu. Each slot holds one item. In Ranked, items are cosmetic only.
Items come from the hub session, so the wardrobe says so when NOBU has no hub connection. A production
build needs `VITE_NAKAMA_SERVER_KEY`; under `vite dev`, or when a build is served from `localhost`
(for example from the dev hub's `public/play/nobu/`), NOBU uses the local stack's stock key instead.

| Item | Slot | Unlocked by | While equipped |
| --- | --- | --- | --- |
| Wizard Hat | Head | Tinubu's Crown (Sproto) | Spell Bark: Mega Bark unlocked, longer (9 m vs 6.5 m), wider and faster. Spell Bark does not damage bosses; fights are retained. |
| Wizard Hat II | Head | Breakwater Coin (Sproto Arcade) | Same as the Wizard Hat: Spell Bark, and the same hat mesh. |
| Champion's Crown | Head | Tidebreaker Belt (Sproto Fighter) | Triple jump (one more air jump) and a 1.4x bite radius (0.95 m to 1.33 m). |
| Golden Collar | Neck | Genesis Block Shard (People's Bitcoin) | Absorbs one hit per spawn or checkpoint. Pits still kill. |
| Clown-Nose Collar | Neck | HPOS10I Core (HPOS10I) | One horizontal air dash (3 m) per jump. |

Both Wizard Hats and the Champion's Crown share the head slot, so Nobu wears one of them. Cone's Tip is
NOBU's own Relic, so it unlocks nothing here. Items live in `src/gear/catalog.js`. The Champion's Crown is a
Tripo model (`public/assets/models/nobu_champions_crown.glb`, asset id `model_nobu_champions_crown`). The other
meshes are procedural (`src/player/accessories.js`) until a GLB is added as `public/assets/models/<item id>.glb`
under the asset id `model_<item id>`. Every item keeps its procedural mesh as the fallback when its GLB is missing.

## Code map

```
src/
  main.js              boot (+ dev-only test helpers in dev.js)
  game/game.js         renderer, main loop, title/map/cutscene/pause/complete/game-over/ending states
  game/session.js      one level + its boss/goal: checkpoints, lives, masks, stats; Rush and Remix helpers
  world/track.js       spline track: (d, lateral) coordinates, ground spans, ramps, walls, water, meshes
  world/physics.js     AABB solids + track collision for bodies
  world/stage.js       scene, lights + shadows, sky, merged decor (with wind sway), steam/bubble emitters
  world/decor.js       procedural scenery: palms, bushes, ferns, grass, flowers, rocks, yarn, pipes, vats, vents
  levels/              kit.js (authoring helpers) + levels 1–6, boss arenas, bonus stages and Box Gauntlets
  player/              player controller, procedural animator, GLB rig + primitive "classic" Nobu
  camera/camera.js     rail cameras (behind / facing for the chase), arena framing, cinematics, shake
  entities/            breakables, tickets, enemies, dogs, mask, props/interactions, ride.js (vacuum ride
                       hazards), glowworm.js (Lumi), secrets.js (Bark Rocks, Good Boy / colored paths, colored
                       bones, Treat Trays, warp sparkles, Freeze Packs),
                       particles (fx.js: cartoon smoke, explosions, dust, shockwaves)
  bosses/              Mecha Bird, Big Cat (+ chase), Evil Cone, Roomba Titan, Pump Queen, shared boss tech
  art/procedural.js    code-drawn textures for the bonus stages and the newer tutorial icons
  gear/                hub Relic items: catalog, ownership (from hub init), local loadout
  hub/                 hubBridge.js (SDK wrapper, Ticket outbox), scoreQueue.js (offline trial score queue)
  config/              tickets.js (Ticket tuning), trials.js (trial board, bounds, medal targets)
  ui/                  HUD, text boxes, pop-ups, menus (DOM)
  audio/               Web Audio synth: every sound effect and all music
  story/script.js      all dialogue, cutscene text, tutorials, death captions
```

## Art pipeline (Higgsfield)

The existing asset library combines Higgsfield concept/image generations, Meshy/Tripo models and procedural
meshes/textures. A saved **Nobu** Element kept the generated Nobu images consistent. Expansion mechanics
also use procedural placeholders; running the game does not require generating new media.

- `public/assets/manifest.json` lists every asset: file, what it's used for, model, job id and full prompt.
- `tools/build_asset_list.py` (+ `tools/asset_list_extra.json`) is the source of truth.
  `python3 tools/process_assets.py [ids]` downloads generations and cuts out backgrounds, then resizes and
  converts them.
- **3D models:**
  - Nobu: Meshy image-to-3D, rigged. Bones are driven procedurally; the Pause/Title menu can switch to the
    primitive "Classic" Nobu.
  - Items, dogs, enemies, bosses and the mask: Tripo image-to-3D from the 2D art.
  - The Champion's Crown: Tripo image-to-3D from its approved concept. The loader scales a model to a set height
    with its base at y = 0 and its front facing +z. A GLB whose front faces elsewhere gets a `rot:AXIS:DEG` op in
    its asset entry (the raw crown faces +x, so it has `rot:y:-90`). The crown loads 0.28 m tall and sits 3 cm
    higher than the procedural one (`CROWN_GLB` in `src/player/accessories.js`) because its band is narrower.
  - Two-legged enemies and the freed dogs: Meshy rigging with walk/dance clips.
- `tools/fix_nobu_eyes.py` retouches the GLB texture: the generator painted extra pupils (a third one, plus a crescent
  on a second eye island). `--cleanup` paints out the leftovers and redraws the right pupil as a clean dot.
- **Your files:** `backpack.webp` (the backpack print) and `mask.avif` (the Sproto face, cut out down to the
  collar) are your source images.
