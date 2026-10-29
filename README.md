# NOBU: Saviour Dog

A PS1-era-style 3D platformer in Three.js (no engine) with $Bitcoin meme lore. Nobu, a white Akita, sets out to
un-cone every dog on the island and take down the Evil Cone.

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173). `npm run build` makes a static build in `dist/`.

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move | Arrows / WASD | Left stick / D-pad |
| Jump (press again in the air: double jump) | Space | A |
| Bite | J or Shift | X / Y / RB |
| Slide (on the ground) · Belly flop (in the air) | K or Ctrl | B / LB / triggers |
| Mega Bark (after beating the Evil Cone) | L or E | Y |
| Pause | Esc / P | Start |

Movement is camera-relative. In the level 2 chase, the camera faces Nobu, so hold **Down / S** to run away
from the cat. `Ctrl` works for slide, but `Ctrl` + `W` is a browser shortcut, so `K` is safer.

**God mode** (title menu → `GOD MODE: ON`): no damage, pits bounce Nobu back onto the last solid ground,
and four jumps in a row (ground jump + three in the air). The setting is saved; a badge shows while it's on.

## What's in it

- **Three levels + three bosses.** Each level runs along a winding, rolling spline track with forks, side
  alcoves and secrets:
  - Bark Jungle, then the Mecha Bird.
  - Scratchpost Canyon, the Big Cat chase, then the Big Cat.
  - The Cone Factory, then the Evil Cone.
- **Two bonus stages** on the level map (no boss), each unlocked by beating the boss before it:
  - **Roomba Rush** (after the Mecha Bird): Nobu rides a runaway robot vacuum through the Owner's House. It drives
    itself; steer with left/right and hop with jump. Ram backpacks and mice; dodge cables, toy piles, table legs,
    cats and rugs.
  - **Glowworm Grotto** (after the Big Cat): pitch dark. Lumi the glowworm lights a circle around Nobu and fades
    over time; glowing mushroom nests top her up, and when she runs out she waits at the next nest.
- **Missed-backpack rain:** at the end of a level every breakable you skipped drops on Nobu's head, one by one.
- **Moves earned from bosses** (replay old levels with them):
  - **Tail Glide** (beat the Mecha Bird): out of jumps, press jump again and hold it to helicopter down slowly.
  - **Zoomies** (beat the Big Cat): slide, then keep holding slide to stay at sprint speed.
  - **Mega Bark** (beat the Evil Cone, `L` / `E` / pad Y): a blast that knocks enemies over and breaks backpacks
    in front of you. Cracked **Bark Rocks** in the levels hide 1UPs and tickets; only a bark opens them.
- **Time trials:** on the map, press `T` (pad Y) on a beaten level. Ice **Freeze Packs** stop the clock for 1-3 s,
  deaths cost no lives, and the run ends at the boss gate with a gold / silver / bronze dog tag and your best time.
- **Good Boy Route:** reach the right spot in levels 1 and 3 without dying and golden paw platforms rise to a
  ledge with a 1UP and a ticket jackpot.
- **Treat Tray bonus round** (level 1): hop in the golden bowl to be whisked up to a sky course of platforms full of
  backpacks and tickets. Fall off and the haul is lost (but not a life); reach the green EXIT tray to keep it.
- **Secret warps:** drop into the far right of level 1's first big double-jump gap, or the far left of level 2's
  mushroom pit (look for the purple glitter), to warp to a bonus stage early.
- **Colored bones:** the RED bone in Glowworm Grotto makes the red path in Bark Jungle solid; the BLUE bone on the Cone
  Factory's fan catwalk does the same for the blue path in Scratchpost Canyon. Until then the paths are ghosts.
- **Bosses:** each boss model is rigged in code (`src/bosses/autorig.js`): the bird's wings flap and its cage swings,
  the cat's paws, spine, head and tail move, and the cone's claws and cape move.
  - **Three evolving stages:** at each new stage the boss transforms in a short cinematic (charge-up, light pillar,
    burst) and comes back bigger, with new parts and a glowing aura, new attacks and faster timing.
  - **No on-screen attack timers:** attacks are telegraphed only by animation (crouches, wind-ups, glows,
    swelling eggs). The ultimate recharges silently; the boss shimmers when it is ready.
  - Mecha Bird (Overclocked → Hyper Mecha): dives, wing gust, visor laser, homing rockets, egg bombs, cone drops.
    Ultimate: **Sky Fall**.
  - Big Cat (Feral → Nine Lives): crouching pounce, swipes, hairballs, yarn ball, claw slashes, tail-whip spin,
    zoomies. A missed pounce leaves it dizzy: stomp its head or bite it.
    Ultimate: **Nine Lives Frenzy**.
  - Evil Cone (Cracked → Supernova): cone spirals, eye lasers, shame vortex, cup grab, ghost clones, sweeps,
    shockwaves, and **pump.fun minions** every phase (they swell with each hop, then dump).
    Ultimate: **Shame Supernova**.
- **Interactions:**
  - Bone Switches that build bridges, a rope drawbridge you bite to lower, bounce mushrooms.
  - Sinking lily pads, flipping planks, crumbling platforms.
  - Cracked floors you belly-flop through, updraft fans, conveyor belts.
  - Swinging cone hammers, crushers, rolling coconuts.
- **Breakables** (Crash's crates, reimagined): Black Backpack (the real Harry Potter / OBAMA backpack print),
  Blue Sphere (Sproto Mask), 1UP Nobu head, Trampoline, Snacks (checkpoint), Cat (TNT: 3-2-1 hiss), Rug (Nitro:
  rug pull), a Lint Roller switch that rolls up every rug, the **Zipped Backpack** (three bites or bounces, a
  ticket each time), the **Vacuum Dock** switch (pops every rug), and unbreakable steel **Lunchboxes** (plain
  steps, and arrow ones that launch you).
- **Tougher enemies:** the **Lid Knight** (bites and bounces clang off its pot lid and colander; slide into it or
  belly-flop it) and the **Shellback** tortoise (jump on it to flip it, then bite it; flipped, it's a springboard).
- **Sproto Mask:** behaves like a tiki-mask guardian.
  - 1 mask absorbs a hit.
  - 2 masks give a gold aura.
  - 3 masks give ~20s of invincibility, with faster music and the mask covering Nobu's face.
- **Rewards:** break everything and free every dog in a level to earn a Golden Bone.
- **Progress:** lives start at 4, with game over and continue. Progress is saved in localStorage.

## Code map

```
src/
  main.js              boot (+ dev-only test helpers in dev.js)
  game/game.js         renderer, main loop, title/map/cutscene/pause/complete/game-over/ending states
  game/session.js      one level + its boss: checkpoints (Crash-style rollback), lives, masks, stats
  world/track.js       spline track: (d, lateral) coordinates, ground spans, ramps, walls, water, meshes
  world/physics.js     AABB solids + track collision for bodies
  world/stage.js       scene, lights + shadows, sky, merged decor (with wind sway), steam/bubble emitters
  world/decor.js       procedural scenery: palms, bushes, ferns, grass, flowers, rocks, yarn, pipes, vats, vents
  levels/              kit.js (authoring helpers) + level1-3, boss arenas, bonusRide.js and bonusCave.js
  player/              player controller, procedural animator, GLB rig + primitive "classic" Nobu
  camera/camera.js     rail cameras (behind / facing for the chase), arena framing, cinematics, shake
  entities/            breakables, tickets, enemies, dogs, mask, props/interactions, ride.js (vacuum ride
                       hazards), glowworm.js (Lumi), secrets.js (Bark Rocks, Good Boy / colored paths, colored
                       bones, Treat Trays, warp sparkles, Freeze Packs),
                       particles (fx.js: cartoon smoke, explosions, dust, shockwaves)
  bosses/              Mecha Bird, Big Cat (+ chase), Evil Cone, shared projectiles + evolution (common.js)
  art/procedural.js    code-drawn textures for the bonus stages and the newer tutorial icons
  ui/                  HUD, text boxes, pop-ups, menus (DOM)
  audio/               Web Audio synth: every sound effect and all music
  story/script.js      all dialogue, cutscene text, tutorials, death captions
```

## Art pipeline (Higgsfield)

All art comes from Higgsfield generations. The style was locked with concept art, and a saved **Nobu** Element
was reused for every Nobu image.

- `public/assets/manifest.json` lists every asset: file, what it's used for, model, job id and full prompt.
- `tools/build_asset_list.py` (+ `tools/asset_list_extra.json`) is the source of truth.
  `python3 tools/process_assets.py [ids]` downloads generations and cuts out backgrounds, then resizes and
  converts them.
- **3D models:**
  - Nobu: Meshy image-to-3D, rigged. Bones are driven procedurally; the Pause/Title menu can switch to the
    primitive "Classic" Nobu.
  - Items, dogs, enemies, bosses and the mask: Tripo image-to-3D from the 2D art.
  - Two-legged enemies and the freed dogs: Meshy rigging with walk/dance clips.
- `tools/fix_nobu_eyes.py` retouches the GLB texture: the generator painted extra pupils (a third one, plus a crescent
  on a second eye island). `--cleanup` paints out the leftovers and redraws the right pupil as a clean dot.
- **Your files:** `backpack.webp` (the backpack print) and `mask.avif` (the Sproto face, cut out down to the
  collar) are your source images.
