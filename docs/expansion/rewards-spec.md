# Rewards, DDA and mastery: implementation spec

H12 provenance: imported from `claude/clever-goodall-8221xu` at `fb95a0a8072ebd02202e4b3d045e4e609b335829` (the 43-part expansion bundle). Sections 10.2–10.5 below record measured corrections and the pending cap decision. Other sections remain the source specification.

Status: **spec only.** It adds implementation detail to sections 3, 4.3, 4.5 and 4.6 of
`docs/gameplay-expansion-plan.md`. It doesn't change any decision there. Where the plan left something
open, the choice made here is listed in section 18.

Line numbers refer to `main` at `bfb4a33`, and they move. Search for the function name.

---

## 0. Conventions

- **Level ids** are strings in the save and numbers or strings in code: `'1' '2' '3' '4' '5' '6'
  'ride' 'cave'`. Compare with `String(id)`.
- **Play order** of the six main levels is **1, 2, 3, 4, 6, 5**. Level 6 is "Smog Rapids":
  - It sits between L4 and L5, opens when L4 is cleared, and has no boss.
  - It ends at a goal, like a bonus stage, but it is a **main level**: it has a full six-bone board, a
    story clear and a time trial.
  - **L5 opens when L6 is cleared.**
  - Its id stays `6`, even though it is fifth in play order, so ids never have to be renumbered.
- **Dogs per level, all content shipped:**

  | L1 | L2 | L3 | Roomba Rush | Glowworm Grotto | L4 | L6 | L5 | Total |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | 9 | 7 | 9 | 4 | 4 | 7 | 7 | 7 | **54** |

- **Raw versus whole Tickets.** A *raw pickup* is one floating ticket. *Whole Tickets* are raw × 1/3,
  rounded down (`NOBU_TICKET_SCALE` in `src/config/tickets.js`). The HUD and the hub show whole
  Tickets. Every new rule says which unit it means.
- **"Run"** means one `Session` from `startLevel()` to the boss gate or goal. A game-over continue starts
  a new Session, and therefore a new run.
- **Contexts** that switch rewards off, checked by `rewardCtx(session)` in a new `src/game/rewards.js`:

  | Flag | Source | Effect |
  | --- | --- | --- |
  | `trial` | `session.trial` | No Chain sphere, no Mystery, no bones, no DDA, no Kennel unlocks, no Buddy |
  | `remix` | `session.remix` (new, M5) | No Mystery, no DDA; only Remix bones |
  | `god` | `save.data.godMode` | No Good Boy Bone, Perfect Run, boss medals or Platinum. Golden, Hidden and Snack bones still count, as the Golden Bone does today |
  | `rush` | `session.rush` (new, M5) | No DDA. Only rush medals |
  | `arena` | `session.phase === 'boss'` | No Chain, no Mystery |

- New pure modules hold no DOM or Three.js, so Vitest can import them:
  - `src/game/bones.js`
  - `src/game/rewards.js`
  - `src/game/progress.js` (Good Boy %)
  - `src/game/dda.js`
  - `src/game/rng.js`

---

## 1. Shared foundation

### 1.1 New `Session` fields (`src/game/session.js`, constructor)

```js
this.runSeed = (Math.random() * 2 ** 32) >>> 0; // Mystery rolls; fixed for the whole run
this.chain = { n: 0, t: 0, best: 0, sphereGiven: false, lastBy: null };
this.snack = { raw: 0, potential: 0 };          // Snack Bones, in raw pickups
this.deathsAtGate = null;                       // set in reachBossGate() / reachGoal()
this.hiddenFound = false;                       // the Hidden Bone was picked up this run
this.sectionMiss = null;                        // { [sectionName]: count }, filled at the gate
this.bossRun = null;                            // boss medals, see 12.2
this.dda = { hazardMul: 1, level: 0 };          // see 11
this.bossStageDeaths = 0;                       // see 11.4
```

### 1.2 Event hooks: where each reward listens

| Event | Existing code | Add |
| --- | --- | --- |
| A countable breakable breaks | `Breakable.markBroken()` → `session.onBreak(this)` (`entity.js`) | `onBreak(b)`: `this._chainHit(b)`, then `_pushHud()` (already there) |
| An enemy is defeated | `Enemy` calls `session.onEnemyDefeated(this)` (`enemies.js` ~180, ~189); the session method is empty today | `onEnemyDefeated(e)`: `this._chainHit(e)` |
| A dog is freed | `ConedDog.free()` → `session.rescueDog()` | Record `dog.dogId` in `this.freedIds` (a Set; rollback below) |
| A ticket is collected | `TicketSystem.update` → `session.addTickets(1)` for static tickets; flying tickets → `addTickets(1, f.source)` | Count into `snack.raw` unless the source is excluded (4.4) |
| A checkpoint is reached | `session.checkpoint(pos, snacks)` | Snapshot `snack.raw`; reset the chain sphere and DDA (11) |
| Death and respawn | `onPlayerDeath()`, `respawn()` | Reset the chain; restore `snack.raw` from `cp`; run DDA |
| The Treat Tray round is left | `_leaveBonusRound(kept)` | When it isn't kept, restore `snack.raw` from the round snapshot |
| Gate or goal | `reachBossGate()`, `reachGoal()`, `_recordLevelStats()` | Freeze `deathsAtGate`, compute `sectionMiss`, the Snack tier and the freed-dog list into `this.stats` |
| Level cleared | `game.levelCleared(session)` (`game.js` ~715) | `applyRunResults(save.data, levelId, stats)` from `bones.js`; Kennel update |
| L6 goal reached | `reachGoal()` → today always `game.bonusCleared()` | New `game.goalLevelCleared(session)` for registry entries with `goal: true, bonus: false` (L6). It does what `levelCleared` does: `beaten['6']`, the six-bone board, `bestDogs`, `dogsFreed`, `hub.bank`, then opens L5. It has no rescue cutscene unless the levels spec adds one. |
| Bonus cleared | `game.bonusCleared(session)` (~762) | Same, with a three-slot board |
| Boss damage | `Boss.damage(p)` (`common.js` ~585) | `session.bossRun.hits++` |
| Nobu takes damage | `Player.hurt()` (`player.js` ~607), `Player.die()` (~692) | `session.onPlayerHurt()`: `bossRun.noHit = false`; `perfect` is unaffected (only deaths count for it) |

**Rollback fields.** Add these to every `cp` snapshot (`_attachActors` and `checkpoint`) and to the
`bonusRound` snapshot (`enterBonusRound`): `snackRaw: this.snack.raw` and `freedIds: new
Set(this.freedIds)`. Restore them in `respawn()` and in `_leaveBonusRound(false)`, next to the existing
`levelTickets` and `fieldRaw` restores.

### 1.3 Save v3 schema (`src/core/save.js`)

`fresh()` gains the fields below. Existing fields not listed keep their current shape.

```js
{
  v: 3,
  // was: unlocked: 1..3 (number). Now: the level ids the player may enter.
  unlocked: 1,                 // KEPT as a number for 1..3 for back-compat; see 1.5. New ids use `open`.
  open: { '1': true },         // every level/bonus/kennel id that is enterable
  beaten: { },                 // { [id]: true }   was [bool, bool, bool]
  bones: { },                  // { [id]: true }   Golden Bone, was [bool, bool, bool]
  bestDogs: { },               // { [id]: n }      was [n, n, n]
  boneBoard: { },              // { [id]: { golden, goodBoy, hidden, snack: 0|1|2|3 } }
  dogsFreed: { },              // { [dogId]: true }, dogId like '1:shiba-a' (5.2)
  bestChain: { },              // { [id]: n }
  chainBadges: { },            // { [id]: true } a chain of 15+ in that level (2.5)
  bossMedals: { },             // { [bossKey]: { clear, noHit, speed, bestMs } }
  perfect: { },                // { [id]: true } Perfect Run relic
  remix: { },                  // { [id]: { golden: bool } }  (M5)
  rush: { clear: false, noHit: false, bestMs: null },          // (M5)
  kennel: { seen: 0, buddy: null, tint: null },                // milestones seen; Buddy breed; fur tint id
  trialsClassic: { },          // layout-1 bests moved out when L1-L3 are extended (6.3 of the plan)
  gauntlets: { },              // { g1|g2|g3: { polaroid, clear, allBoxes, noDeath, firstPaid } } (box-gauntlets-spec 4)
  // unchanged: lives, tickets, seenIntro, finished, lastLevel, tutorials, nobuModel, pixelated,
  // godMode, loadout, bonus, trials, colorBones, musicVol, sfxVol
}
```

- `colorBones` gains `green`, `yellow` (plan 6.1 and 6.2) and `purple` (Level 6). Its shape doesn't change.
- **No derived values are stored.** Kennel milestones, Good Boy % and the move list are computed every
  time (`progress.js`, `abilities`). `kennel.seen` is only the highest milestone whose "NEW!" pop-up
  has been shown.

### 1.4 Sanitizers

Add these next to `sanitizeTrials` and `sanitizeBonus`:

```js
const IDS = ['1', '2', '3', '4', '5', '6', 'ride', 'cave'];          // from the level registry (plan 10.1)
const boolMap = (v, ids = IDS) => Object.fromEntries(ids.filter((k) => isObj(v) && v[k] === true).map((k) => [k, true]));
const countMap = (v, ids = IDS) => Object.fromEntries(ids.map((k) => [k, count(isObj(v) ? v[k] : 0)]).filter(([, n]) => n > 0));
function sanitizeBoard(v) {
  const out = {};
  for (const k of IDS) {
    const e = isObj(v) ? v[k] : null;
    if (!isObj(e)) continue;
    out[k] = { golden: e.golden === true, goodBoy: e.goodBoy === true, hidden: e.hidden === true,
               snack: Math.min(3, Math.max(0, Math.floor(finite(e.snack, 0)))) };
  }
  return out;
}
const BOSS_KEYS = ['bird', 'cat', 'cone', 'titan', 'queen'];
function sanitizeMedals(v) {
  const out = {};
  for (const k of BOSS_KEYS) {
    const e = isObj(v) ? v[k] : null;
    if (!isObj(e)) continue;
    out[k] = { clear: e.clear === true, noHit: e.noHit === true, speed: e.speed === true,
               bestMs: Number.isInteger(e.bestMs) && e.bestMs > 0 ? e.bestMs : null };
  }
  return out;
}
const DOG_ID = /^(1|2|3|4|5|6|ride|cave):[a-z]+-[a-z0-9]+$/;
const sanitizeDogs = (v) => Object.fromEntries(Object.keys(isObj(v) ? v : {}).filter((k) => DOG_ID.test(k) && v[k] === true).map((k) => [k, true]));
```

`sanitize(d)` calls each of these. Drop the `bools3` uses for `beaten` and `bones` once the migration
below has run. Leave `trials` alone; `sanitizeTrials` already handles it.

### 1.5 Migration v2 → v3, step by step (in `save.load()`)

The current code runs `data = sanitize({ ...fresh(), ...old })`, then the `v >= 2` fix. Insert a
`migrate(old)` step **before** `sanitize`:

1. If `old.v >= 3`, return it unchanged.
2. **`beaten`:** if it is an array, turn it into an object, `{ '1': !!a[0], '2': !!a[1], '3': !!a[2] }`,
   keeping only the true entries.
3. **`bones`:** the same conversion.
4. **`bestDogs`:** if it is an array, turn it into `{ '1': a[0], '2': a[1], '3': a[2] }`, keeping only
   values above 0.
5. **`boneBoard`:** for each id where the old `bones[i]` was true, set `boneBoard[id] = { golden: true,
   goodBoy: false, hidden: false, snack: 0 }`. No other slot is granted retroactively, because v2 never
   tracked deaths or Ticket %.
6. **`open`:**
   - Add `'1'..String(old.unlocked)`.
   - Add `ride` if `old.beaten[0]`, or `old.bonus.ride.found`, or `old.bonus.ride.beaten`.
   - Add `cave` the same way using `beaten[1]`. This copies `mapOpen()` in `game.js`.
   - Add `kennel` if any dog was ever freed (`bestDogs` sum > 0).
7. **`dogsFreed` (approximate):** for each level, mark the first `bestDogs[id]` entries of that level's
   dog-id list in the registry as freed. Example: `bestDogs['1'] = 3` marks `1:shiba-a`, `1:pug-a` and
   `1:dalmatian-a`. This can mark the wrong individual dogs; that is accepted, because v2 never stored
   which ones. Bonus stages had no `bestDogs`, so none are marked.
8. **`unlocked`:** keep it as a number capped at 3, so older code paths still work during M0. The
   registry's `unlock(save)` reads `open` from M0 on.
9. Set `v = 3`.

`multitab.test.js` covers the multi-tab case. A tab still on v2 code may write a v2 save while a v3 tab
is open. The v3 tab's `write()` merges the disk copy through `mergeScores`, so `migrate()` must also run
on the disk copy inside `mergeScores` (see 1.6).

### 1.6 Multi-tab merge (`mergeScores(mine, disk)`)

Extend it so another tab's progress is never lost. Run `migrate()` on `disk` first. Merge rules:

| Field | Rule |
| --- | --- |
| `beaten`, `bones`, `open`, `dogsFreed`, `perfect`, `chainBadges`, `colorBones` | union (OR) |
| `boneBoard[id]` | OR each boolean; `snack = max` |
| `bestChain[id]`, `bestDogs[id]` | max |
| `bossMedals[k]` | OR each boolean; `bestMs = min` of the non-null values |
| `remix[id].golden`, `rush.clear`, `rush.noHit` | OR; `rush.bestMs = min` |
| `trialsClassic[id]` | lower `ms` wins (same as `trials`) |
| `kennel` | keep `mine` (cosmetic choices are per tab); `seen = max` |

`save.reset()` (New Game) keeps `trials` and `trialsClassic`, as today. It also keeps `bossMedals`,
`perfect`, `rush` and the trial-related Platinum medals, because they are mastery records in the same
spirit. Everything else is cleared. The copy for the New Game confirm dialog is in section 15.

---

## 2. Chomp Chain

### 2.1 Rules

- **A hit** is a countable breakable breaking (`onBreak`) or an enemy defeated (`onEnemyDefeated`) in
  `phase === 'level'`. Arena breakables are `countable = false` and never reach `onBreak`.
- **Timer:** `CHAIN_WINDOW = 1.1` s. Each hit sets `chain.n += 1` and `chain.t = CHAIN_WINDOW`.
- **The timer only runs while Nobu is grounded.** In `session.update(dt)`:

  ```js
  const c = this.chain;
  if (c.n > 0 && !this.busy) {
    if (g.player.body.grounded || g.player.ride) c.t -= dt;   // airborne time is free: stack bounces, long jumps
    if (c.t <= 0) this._endChain();
  }
  ```

  This is the plan's rule ("touching the ground for more than 1.1 s without breaking anything ends it")
  as one timer. On the Roomba ride Nobu is always "grounded", so the timer runs all the time there.
- **Ends on:** the timer running out, death (`onPlayerDeath`), respawn, entering or leaving the Treat
  Tray round, `reachBossGate`, `reachGoal`.
- **Explosions count.** A Cat (TNT) chain reaction breaks several backpacks in one frame. Each one is a
  hit, so a chain of 6 from one explosion is fine and intended: it rewards setting up a blast.
- **Excluded:** Freeze Packs (trials only), Bark Rocks (they are not `Breakable`), freeing dogs.
- **Worked example:** stomp a stack of 3 (hits 1–3; airborne the whole time), land and bite a backpack
  0.6 s later (hit 4), slide into 2 more within 0.5 s (hits 5–6), squash a Broccoli 0.9 s later (hit 7),
  then a backpack 1.0 s later (hit 8). The **Blue Sphere drops**. Nobu stands still for 1.1 s and the
  chain ends at 8.

### 2.2 Reward

- When `chain.n` reaches **8** and `!chain.sphereGiven` and `!ctx.trial`, spawn a non-countable
  `BlueSphere` 1.2 m ahead of Nobu on the track, at `player.facing`, and set `sphereGiven = true`.

  ```js
  const s = new BlueSphere(this.stage, x, y, z); s.countable = false; s.chainDrop = true; this.stage.add(s);
  ```

  Use the same constructor call as the phase spheres in `onBossPhase()`.
- `sphereGiven` resets to false in `checkpoint()` and in `respawn()`. That makes it **one sphere per
  checkpoint section per life**. Masks reset on death anyway, so the reset can't be farmed for extra
  masks.
- If the drop point is over a pit (`track.groundAt(d, x)` returns nothing), spawn it on Nobu instead.
- Chain-drop spheres are removed in `respawn()` (`e.chainDrop` → `stage` removal), so a rollback
  doesn't leave them lying around.

### 2.3 Feedback

- **HUD:** a new slot `chain` in `ui/ui.js`, next to the tickets slot.
  - Text `x{n}` from n ≥ 2. Hidden below 2.
  - Uses `setHud('chain', 'x5', { bump: true })`.
  - Fades 0.6 s after the chain ends, showing the final number.
- **Pitch:** `audio.play('break', 2 ** (Math.min(n - 1, 12) / 12))`. Today the `'break'` case ignores
  `p`; multiply its oscillator frequencies by `p`. Apply the same change to `'squash'` for enemy hits.
- **Screen punch:** `camera.shake(0.12, 0.12)` at n = 5 and `camera.shake(0.2, 0.15)` at n = 10, plus
  a new `'chainUp'` sound (16).
- **Banner** at the sphere drop: `CHOMP CHAIN x8!`, subtitle `Sproto Mask!`, 1.2 s.

### 2.4 Records

- `chain.best = max(chain.best, n)` when a chain ends. It goes into `stats.bestChain` at the gate.
- Saved at level clear: `bestChain[id] = max(old, stats.bestChain)`. "NEW BEST CHAIN" in the tally
  (7.2) when it beats the old value **and** the old value was above 0 (no "new best" on the first
  clear).

### 2.5 Chain badges (the cosmetic Kennel tie-in)

- A chain of **15 or more** in a level sets `chainBadges[id] = true`. It is saved at clear, like
  `bestChain`.
- The Kennel sign shows one paw badge per level that has one. **5 badges** unlock the cosmetic fur tint
  `chompGold`, which is added to the fur-tint list (5.4).

### 2.6 Edge cases

| Case | Behaviour |
| --- | --- |
| A trial run | The counter shows and the pitch rises, but no sphere drops, and `bestChain` and badges are not saved |
| God mode | Everything works; chains are cosmetic |
| A chain carries into the Treat Tray | It ends on entry. A new chain can build up there. The sphere can drop in the tray round. |
| Breaking a backpack, dying, respawning | The chain is reset to 0 on death. Restored backpacks can be chained again. |
| A Mystery result spawns a Cat that explodes 3 backpacks | 3 hits; the Mystery itself was hit 1 |
| Zipped Backpack, first 2 bites | Not breaks (no `markBroken`), so no hit. The final break is a hit. A bite does **refresh** the timer, because it is clearly purposeful play: add `session.chainRefresh()` to `ZippedBackpack.break` before its early return. |

---

## 3. Mystery Backpack

### 3.1 Entity

- `class MysteryBackpack extends ZippedBackpack`, in `src/entities/breakables.js`:
  - `this.kind = 'mystery'`, `maxHits = hits = 1`. **One bite opens it**, as do any break, stomp, flop,
    slide or explosion.
  - Placeholder look: the navy zipped model with no pull tags and a procedural "?" decal (a canvas
    texture made with the `textTexture('?')` helper that `Cat` uses for its countdown digits), bobbing
    0.06 m.
  - `this.slot`: the authoring order of this Mystery in the level (0, 1, 2), set by `k.mystery`.
- **Kit:** `k.mystery(x, y, d)` assigns `slot` automatically. In a trial or remix session it places a
  plain `Backpack` with default tickets instead, so the breakable total still matches between modes.

### 3.2 Seeded roll (`src/game/rng.js`)

```js
export function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hash32(...parts) { let h = 2166136261; for (const p of parts.join('|')) { h ^= p.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export const MYSTERY_TABLE = [
  { id: 'tickets', w: 40 }, { id: 'sphere', w: 25 }, { id: 'cat', w: 15 }, { id: 'tramp', w: 10 }, { id: 'oneUp', w: 10 },
];
export function rollMystery(runSeed, levelId, slot, table = MYSTERY_TABLE) {
  const r = mulberry32(hash32(runSeed, levelId, slot))();
  let acc = 0; const total = table.reduce((s, e) => s + e.w, 0);
  for (const e of table) { acc += e.w / total; if (r < acc) return e.id; }
  return table[table.length - 1].id;
}
```

- The **same run** (same `session.runSeed`) always gives the same result for a slot. Dying and coming
  back to it rerolls nothing.
- A **new run** (re-entering the level, or a continue after game over) rolls again. That keeps it a
  real variable reward, while one death never rerolls it.
- `tramp` falls back to `sphere` when the slot has no authored ledge (`k.mystery(..., { tramp: false })`).

### 3.3 Results

| Result | What spawns at the backpack's position | Notes |
| --- | --- | --- |
| `tickets` | `tickets.spawnFlying(x, y + 1, z, 9, 'mystery')` | 9 raw = **3 whole Tickets**. The source tag lets Snack Bones exclude it (4.4) |
| `sphere` | non-countable `BlueSphere` | |
| `cat` | non-countable `Cat`, fuse already lit (`timer = 0`) | `'hiss'` plays at once, through Cat's own countdown at `n === 3`. Banner `SURPRISE!`, subtitle `RUN!` |
| `tramp` | non-countable `Trampoline` | The authored ledge sits above it |
| `oneUp` | `session.addLife(1)` with a `OneUp`-style burst and `'oneUp'` | Lives are not rolled back on death today (`addLife` writes `save.data.lives`). Same here. |

- Spawned entities are stored in `this.spawned`. `onRestore()` removes them from the stage
  (`stage.remove(e)`, or hide plus `dead = true` if there's no remove) and resets `hits`.
- **Order:** `markBroken()` first, so the Mystery is a counted breakable and a chain hit. Then the
  spawn.

### 3.4 Placement rules (enforced in review, not in code)

- 2–3 per level, never on the critical path, never above a pit (a Cat result must leave room to run).
- At least 4 m from another Cat or Rug.
- Plan 6.1, 6.2 and 6.3 positions: L1 Canopy Walk branch, L1 tray-side table, L4 Hallway side table,
  L5 Opening bell, L2 Cardboard Fort.

---

## 4. Bone Board

### 4.1 Pure rules (`src/game/bones.js`)

```js
export const SNACK_TIERS = [0.40, 0.60, 0.80];
export const GOOD_BOY_MAX_DEATHS = { default: 3 };   // tier-5 override allowed by plan risk 3, e.g. { 5: 5 }
export function snackTier(raw, potential) {
  if (!(potential > 0)) return 0;
  const f = raw / potential;
  return f >= SNACK_TIERS[2] ? 3 : f >= SNACK_TIERS[1] ? 2 : f >= SNACK_TIERS[0] ? 1 : 0;
}
export function runBones(stats, ctx) {           // stats from _recordLevelStats(); ctx from rewardCtx()
  if (ctx.trial || ctx.remix) return null;
  const golden = stats.breakables > 0 && stats.broken >= stats.breakables && stats.dogs >= stats.dogsTotal;
  const max = GOOD_BOY_MAX_DEATHS[stats.level] ?? GOOD_BOY_MAX_DEATHS.default;
  return {
    golden,
    goodBoy: !ctx.god && stats.deathsAtGate <= max,
    hidden: !!stats.hiddenFound,
    snack: snackTier(stats.snackRaw, stats.snackPotential),
  };
}
export function applyRunResults(save, id, run) {   // never removes a bone (plan 6.3)
  const b = save.boneBoard[id] ||= { golden: false, goodBoy: false, hidden: false, snack: 0 };
  const fresh = [];
  for (const k of ['golden', 'goodBoy', 'hidden']) if (run[k] && !b[k]) { b[k] = true; fresh.push(k); }
  if (run.snack > b.snack) { for (let t = b.snack + 1; t <= run.snack; t++) fresh.push('snack' + t); b.snack = run.snack; }
  if (b.golden) save.bones[id] = true;              // keeps the old Golden Bone map in step
  return fresh;                                       // for the tally's stamp order
}
```

`levelCleared()` replaces `if (bone) d.bones[n - 1] = true;` with
`const fresh = applyRunResults(d, String(n), runBones(st, rewardCtx(session)) || {})`, and passes
`fresh` to `_showComplete`.

### 4.2 Golden Bone

- The current rule doesn't change (`levelCleared` in `game.js` ~719).
- **Never revoked.** When extensions add breakables, a bone earned earlier stays (`applyRunResults`
  only sets values to true).
- Bonus stages gain a Golden Bone (plan 3.4: a three-slot board). It is stored in `boneBoard.ride` and
  `boneBoard.cave`.

### 4.3 Good Boy Bone

- `session.deaths` already counts every death in the run. `reachBossGate()` and `reachGoal()` set
  `this.deathsAtGate = this.deaths` before anything else. Boss deaths don't count.
- The bone is **banked only when the level is cleared** (`levelCleared` after the boss, or
  `bonusCleared`). Quitting or a game over loses it, as with the Golden Bone.
- Wizard Hat (bosses skipped): `levelCleared` still runs, so the bone is earned normally.
- God mode: never awarded, because pits bounce and deaths can't happen.
- Worked example: die twice at the lily pond and once on the coconut hill, then die 4 times to the
  Mecha Bird. `deathsAtGate = 3`, so the bone is **earned**.

### 4.4 Snack Bones (the Ticket-percentage tiers)

- **Unit:** raw pickups, so the scaling remainder doesn't matter.
- **`snack.raw`:** in `addTickets(n, source)`, before the scale, add `n` when
  `!SNACK_EXCLUDED.has(source)`:

  ```js
  const SNACK_EXCLUDED = new Set(['coconut', 'mystery', 'jackpot', 'bark']);
  ```

  - Coconuts are endless, so they're excluded.
  - Mystery Tickets are random.
  - `jackpot` covers the Good Boy Route and colored paths, which aren't open to everyone.
  - `bark` covers Bark Rocks, which are move-gated.
  - These sources need the tag passed through `spawnFlying(..., source)`, which already takes one:
    - `GoodBoyRoute` jackpot → `'jackpot'`.
    - `BarkRock` ticket prize → `'bark'`.
    - Mystery → `'mystery'`.
  - Untagged sources (static tickets, backpacks, Zipped Backpacks) count.
- **`snack.potential`:** computed once, after `this.tickets.finalize()` in `startLevel()`:

  ```js
  potential = tickets.list.length                                   // every static ticket, tray tickets included
            + Σ (Backpack|ZippedBackpack, countable, not Mystery) b.tickets   // their rolled 1–5, or authored n
  ```

  - Backpacks roll `randInt(1, 5)` at build, so the potential differs from run to run; the percentage
    is always against this run's own numbers.
  - `ZippedBackpack.tickets` is the full 8 (two bite ticks of 1, then the break pays the rest).
- **Rollback:** `snack.raw` is saved in every `cp` and in the tray snapshot (1.2).
- Worked example: a run with 120 static tickets and 30 backpacks rolling a total of 92 has potential
  212.
  - Bronze needs 85 (40%), silver 128 (60%), gold 170 (80%).
  - Collect 140 raw and the tier is **2 (silver)**. The tally stamps bronze, then silver.

### 4.5 Hidden Bone

- Entity `HiddenBone` in `src/entities/secrets.js`:
  - Uses the `golden_bone` sprite at 0.8 m, tinted cyan.
  - It is a pickup like `ColorBone`, not a `Breakable`.
- Authoring: `k.hiddenBone(x, y, d, { move: 'dust' | 'moon' | 'glide' | 'zoom' | 'bark' | null })`.
  The `move` value is only used by hints.
- **Picking it up saves at once**, like `collectBone` does for colored bones:
  `boneBoard[id].hidden = true; save.write()`. It doesn't wait for the level clear. Hidden secrets are
  the hardest to reach, and losing one to a later death would feel unfair.
  - Banner `HIDDEN BONE!`, subtitle `Shhh... it's a secret`, sound `'oneUp'` + `'chime'`.
  - Also sets `session.hiddenFound = true` for the tally.
- If it was already found, the bone shows as a translucent ghost and gives nothing.
- In a trial, the entity isn't built.

### 4.6 Where the board is shown

- **Pause menu** (`_drawPause`, `game.js` ~585):
  - A row of 6 icons above the menu, live. Golden (filled when this run is on track to earn it, else
    a silhouette), Good Boy (shows `deaths/3`), Hidden, and the 3 Snack tiers filled up to the current
    run's tier.
  - Below the icons: `Breakables x/y · Dogs x/y · Snacks 63%`.
  - Saved bones show solid gold; bones this run would earn show white outlines.
- **Map panel** (`_drawMap`, around ~350–372): the 6 icons, saved state only, replacing the single
  `golden_bone` image. The status line becomes the next-goal hint (8).
- **Results** (7): stamped in.

---

## 5. The Kennel

### 5.1 Map node

- `MAP_ORDER` (later the registry) gets `'kennel'` at the end, at `mapPos { x: 88, y: 72 }`.
  - It opens once any dog has ever been freed (`open.kennel`).
  - It has no Session. Selecting it sets `game.state = 'kennel'`.
- **Kennel scene** (`updateKennel`, `_drawKennel` in `game.js`):
  - Reuses the title-screen 3D background setup (`render()` already draws the scene in title and
    wardrobe states, `game.js` ~132).
  - A fenced yard is built from `decor.js` `fencePost`s around a 12 × 8 m patch of grass.
- Each entry in `dogsFreed` spawns its breed's `dog_*_free` GLB:
  - Up to 54 dogs, scattered on a 9 × 6 jittered grid.
  - Each plays its dance clip, offset by `index * 0.37` s.
  - On a low-end GPU (`renderer.capabilities.maxTextures < 16` or DPR clamp active), show 12 dogs plus
    a `+N` sign.
- **DOM panel:**
  - A list of milestones with `✓` or the dogs still needed.
  - Buttons for Jukebox, Buddy, Fur and Gallery when unlocked.
  - The chain badges row.

### 5.2 Stable dog ids

- `k.dog(x, y, d, breed, { id })`. **Every** `k.dog` call gets an explicit `id`, and once released an
  id never changes.
  - Format: `<breed>-<letter>`. The save key is `<levelId>:<id>`, for example `1:shiba-a` and
    `1:shiba-b`.
  - The ids are added in M0 for existing dogs, in authoring order, so the 1.5 migration can map
    `bestDogs` to ids.
- `ConedDog` stores `this.dogId`. `session.freedIds` is updated in `rescueDog()`:
  `freedIds.add(dog.dogId)`. Rollback is covered in 1.2.
- At the gate, `stats.freedIds = [...freedIds]`. `levelCleared` and `bonusCleared` set
  `dogsFreed[`${id}:${dogId}`] = true` for each.
- `registry.test.js` checks that ids are unique within each level and match `DOG_ID`. This test reads a
  static `dogs` list from the registry; the kit can't be imported without Three.js.

### 5.3 Milestones (pure, `progress.js`)

```js
export const KENNEL_MILESTONES = [
  { at: 8, id: 'jukebox' }, { at: 16, id: 'buddy' }, { at: 24, id: 'fur' },
  { at: 32, id: 'gallery' }, { at: 42, id: 'sniffer' }, { at: 'all', id: 'golden' },
];
export const dogsFreedCount = (save) => Object.keys(save.dogsFreed).length;
export function kennelUnlocks(save, totalDogs) {
  const n = dogsFreedCount(save);
  return KENNEL_MILESTONES.filter((m) => (m.at === 'all' ? n >= totalDogs : n >= m.at)).map((m) => m.id);
}
```

- `totalDogs` comes from the registry: **54** with all content shipped, and lower before that.
  `'all'` is always the current total.
- **Why these thresholds.** They are spread about every 8 dogs over 54, with the last one at all 54.
  - The Sniffer, the anti-grind hint, comes at 42, which leaves 12 dogs for it to help find.
  - 8 dogs is about the first two levels, so the Jukebox comes early.
  - The plan's old thresholds (5 / 10 / 15 / 20 / 25) assumed about 37 dogs. The unlock items and their
    order are the same.
- A milestone whose threshold is above the shipped total isn't shown, and doesn't count in Good Boy %
  (9.1), until enough dogs ship.
- **New milestone pop-up:** at level clear, if `kennelUnlocks(...).length > kennel.seen`, show a banner
  on the results screen after the board: `KENNEL: BUDDY UNLOCKED!`. Then set `kennel.seen`.

### 5.4 Unlock behaviour

| Unlock | Behaviour |
| --- | --- |
| Jukebox | A list of every song key in `audio/songs.js`; ◀ ▶ picks, SPACE plays with `audio.playMusic(key)`; ESC stops |
| Buddy | Pick a breed you have freed (or `none`). `kennel.buddy = 'pug'`. In `phase === 'level'`, outside trials, remixes and rides, a `Buddy` entity (new, `src/entities/buddy.js`) follows Nobu (details below). |
| Fur | Tints: `none`, `cream #f3e3c3`, `shadow #5a5560`, `ginger #d08a4a`, `chompGold #f2c14e` (needs 5 chain badges). `kennel.tint`. Applied as `material.color.multiply` on the Nobu GLB body materials and the Classic primitive fur material. Off in trials. |
| Gallery | Full-screen viewer of `concept_keyart`, `concept_environments`, `story_intro_1..4`, `story_rescue_1..3`, `story_ending`; ◀ ▶ |
| Sniffer | See 5.5 |
| Golden | One-time cutscene: every dog dances and the Sproto Mask speaks a line (15). After it, the title screen's Nobu plays the dance pose. |

Buddy details:

- It follows 1.6 m behind and 0.8 m to the side, using damped follow.
- It teleports to Nobu if more than 8 m away or after a respawn.
- It has no collision and doesn't affect gameplay.
- It uses the `dog_<breed>_free` GLB's walk clip. These GLBs are Meshy-rigged and have walk and dance
  clips (README).

### 5.5 Sniffer

- In the Kennel, pressing bark (`L` / `E` / pad Y) opens the Sniffer list. On the map it is shown in
  the panel for the selected level, once `sniffer` is unlocked.
- It lists every missing Hidden Bone and dog for every **open** level:
  `Bark Jungle: Hidden Bone near The Burrow (needs DUST DASH) · 1 dog near Canopy Walk`.
- **Data source:** static metadata in the registry, so no level has to be built:

  ```js
  { id: '1', sections: [[0, 26, 'Start'], [26, 58, 'High Road'], ...],
    dogs: { 'shiba-a': 'Start', 'pug-a': 'Treat Ledge', ... },
    hidden: { section: 'The Burrow', move: 'dust' } }
  ```

- A dev check in `dev.js`: after `startLevel`, compare each built `ConedDog.dogId` and the section
  containing its `d` with the registry, and `console.error` any mismatch. It can't be a Vitest test,
  because levels need Three.js.

---

## 6. Move-gated secrets: bookkeeping

### 6.1 Moves come from the beaten map

`Player.abilities` (`player.js` ~162) becomes:

```js
get abilities() {
  const b = save.data.beaten || {};
  return { glide: !!b['1'], zoom: !!b['2'], bark: !!b['3'] || !!this.gear.spell_bark,
           dust: !!b['4'], moon: !!b['5'], airDash: !!this.gear.air_dash };
}
```

The only change is reading `'1'` instead of `[0]`, plus the two new moves. Nothing about moves is
stored.

L6 has no boss, so clearing it grants no move. Its gated secrets use moves the player already has by
then (glide, zoom, bark, dust). `moon` comes from `beaten['5']`, the Pump Queen.

### 6.2 Gated objects

Each gated object builds in one of two states, chosen at build time from `game.player.abilities`:

| Object | Locked look (still visible: "a gated object always looks gated") | Unlocked |
| --- | --- | --- |
| Zoomie Gate | Shutter down; a floor plate glows orange; touching the plate without the move raises the shutter only 0.4 s | Plate opens it for `open` s (default 2.5) |
| Smog Vent | Purple fog column; a lift platform hidden inside | Mega Bark within 6 m clears the fog for 8 s and the lift runs |
| Dust Wall | Grey fuzz box (procedural noise texture); `solid` | Dust Dash breaks it (a `'dust'` puff); stays broken for the run; restored on rollback if broken after the checkpoint |
| Moon Ledge | Platform outlined in pale blue, glowing; **solid** (you can land on it from above) but placed out of jump reach | Same; only the Moon Jump reaches it |
| Glide gap | A floating alcove too far for a double jump | Tail Glide reaches it |

- **Signposting copy:** when Nobu is within 4 m of a locked object for the first time per level, show
  a tutorial-style pop-up (`ui.tutorial` with new ids, for example `gate_dust`): `A DUST WALL. Something
  in the Owner's House could break this...`. The text names the move only after the boss that gives it
  has been met (`beaten` of the boss before it). Until then it gives a hint, not the name.
- `HiddenBone.move` drives the Sniffer text (5.5) and the next-goal hint (8).

### 6.3 Rule check (Golden Bone never gated)

- In `dev.js`, after build: walk every countable `Breakable` and `ConedDog`. If one lies inside a
  gated area (a bounding box declared by each gated object as `gatedBox`), `console.error('gated
  countable')`.
- Gated areas may only hold Hidden Bones, tickets, 1UPs, remix-only extras and **non-countable**
  breakables (`countable = false`).

---

## 7. End-of-level tally

### 7.1 Data passed to the screen

`_showComplete(n, st, fresh, bonus)`. Here `st` is `session.stats`, extended with:

```js
{ tickets, broken, breakables, dogs, dogsTotal,        // existing
  bestChain, deathsAtGate, snackRaw, snackPotential, snackTier, hiddenFound,
  sectionMiss: { 'Lily Pond': 3, 'Canopy Walk': 1 }, missedDogs: { 'Canopy Walk': 1 } }
```

`fresh` is the list of new bone keys from `applyRunResults` (4.1), in stamp order.

### 7.2 Sequence and timings

The screen opens after the existing rescue cutscene (`playCutscene(RESCUE[n], ...)`). Timings count
from when the screen first appears. Lines replace the current `stat-row` reveal (`game.js` ~790).

| t (s) | Step | Visual | Sound |
| --- | --- | --- | --- |
| 0.0 | Title `LEVEL n COMPLETE!` / `BONUS STAGE CLEAR!` | fade in | music `'complete'` (exists) |
| 0.5 | **Backpacks** counts 0 → broken over `min(1.2, 0.03 × broken)` s; then `/total` | number ticks | `'blip'` every tick, `p` rising from 1 to 2 across the count |
| +0.3 | **Dogs** 0 → freed, one tick per dog, 0.18 s each | dog icon pops per tick | `'ticket'` per dog |
| +0.3 | **Tickets** 0 → whole Tickets, over `min(1.0, 0.02 × n)` s | | `'blip'` |
| +0.3 | **Best Chain** `xN` (shown only if N ≥ 5) | `NEW BEST CHAIN` flashes if it is a record (2.4) | `'chainUp'` (new) |
| +0.5 | **Bone Board** row of 6 (3 on bonus stages) shown as silhouettes, with already-owned bones solid | | |
| +0.4 each | Each key in `fresh` **stamps** in: scale 2 → 1 over 0.18 s, then a 0.12 s shake | `camera`-free; a CSS shake on the screen element | `'stamp'` (new); the last stamp also plays `'oneUp'` |
| +0.6 | **Next-goal hint** line (8) | type-on, 40 chars/s | `'blip'` every 3 chars |
| +0.4 | Kennel milestone banner, if any (5.3) | | `'chime'` |
| end | `Press any key` | | |

- **Skippable:** any key after the screen has played once in this save (`save.data.tutorials.tallySeen`)
  jumps straight to the final state. On the very first tally, input is ignored until the end, as
  today's `completeT > 2.3` guard does. Raise that guard to the sequence length.
- The existing `updateComplete` continue logic (between-level text, ending, map) is unchanged.

### 7.3 Missed-backpack rain

Unchanged. It plays before the boss or goal, earlier than the tally. The plan order is rain, then the
tally, then the board.

---

## 8. Next-goal hint

### 8.1 Sections

- `k.section(d0, d1, name)` pushes onto `stage.sections`.
- Every level declares sections covering its whole length; the registry copy (5.5) must match.
- At the gate, `_recordLevelStats()` maps each uncounted breakable and each un-freed dog to a section
  name, using `track.project(e.pos.x, e.pos.z).s`:

  ```js
  const secAt = (s) => (this.stage.sections.find(([a, b]) => s >= a && s < b) || [0, 0, 'the path'])[2];
  ```

### 8.2 Choosing the one hint (pure, `bones.js`)

`nextGoal(board, stats, ctx, abilities)` returns `{ text }`. Missing goals are tried in this priority
order, and the first match wins:

1. **Golden Bone missing, few left:** fewer than 6 breakables or dogs missing. Name the section with
   the most misses: `Golden Bone: 3 backpacks missed near Lily Pond.` If dogs are missing too:
   `Golden Bone: 1 dog and 2 backpacks missed near Canopy Walk.`
2. **Good Boy Bone missing and deaths ≤ 6:** `Good Boy Bone: 5 deaths, need 3 or fewer.`
3. **Snack Bone one tier away:** within 10 percentage points of the next tier. `Snack Bones: 72% of
   Tickets, 80% for gold.`
4. **Hidden Bone missing:**
   - If its move is owned: `Hidden Bone: somewhere near The Burrow.` (After the Sniffer is unlocked,
     the section is always named; before that, only if the move is owned.)
   - If its move is not owned: `Hidden Bone: you'll need a new move to reach it.`
5. **Golden Bone missing, many left:** `Golden Bone: 14 backpacks to go. Try the side paths.`
6. **Everything owned:** if the level has a trial, `Board complete! Try the time trial for a
   Platinum Tag.` Otherwise: `Board complete! Good boy.`

- The map panel calls `nextGoal` with **saved** data only, using the last run's stored `sectionMiss`.
  Store it as a small object `lastMiss[id] = { 'Lily Pond': 3 }` in the save. It is optional: if it is
  missing, hint 1 drops the section name.

  The schema addition is `lastMiss: {}`, a map of section name to count, at most 12 keys per level;
  the sanitizer clips longer names to 40 characters.

---

## 9. Good Boy %

### 9.1 Formula (`progress.js`)

Base track (completion), **95 points**, displayed as `floor(points / 95 × 100)`:

| Item | Points | Arithmetic | Source |
| --- | --- | --- | --- |
| Story clear, 6 main levels (1, 2, 3, 4, 6, 5) | 24 | 6 × 4 | `beaten[id]` (L6: reaching its goal) |
| Bone Board, 6 main levels | 36 | 6 levels × 6 slots (golden, goodBoy, hidden, snack1, snack2, snack3) | `boneBoard` |
| Bonus boards (ride, cave) | 6 | 2 × 3 slots (golden, goodBoy, hidden) | `boneBoard` |
| Colored bones (red, blue, green, yellow, purple) | 5 | 5 × 1 | `colorBones` (purple is found in L6) |
| Dogs | 18 | `floor(freed / 3)`, max `floor(54 / 3)` | `dogsFreed` |
| Kennel milestones | 6 | 6 × 1 | `kennelUnlocks` |
| **Total** | **95** | 24 + 36 + 6 + 5 + 18 + 6 | |

- **When content isn't shipped yet**, the denominator only counts shipped items. The registry marks
  each level `shipped: true|false`.
- Milestones count only if their threshold is at or below the shipped dog total, plus `all`.
- Example, before M3, with only L1–L3 and both bonus stages in today's layout (17 dogs: 5 + 3 + 5 + 2
  + 2):
  - Story: 3 × 4 = 12.
  - Boards: 3 × 6 = 18.
  - Bonus boards: 6.
  - Colored bones: red and blue, 2.
  - Dogs: `floor(17 / 3)` = 5.
  - Milestones: jukebox (8), buddy (16) and all = 3.
  - Total: **46**.

  So 100% is always reachable with the content that exists.

Mastery track, **100 points**, added on top as points, so the total can reach 200%:

| Item | Points | Arithmetic |
| --- | --- | --- |
| Gold trial tag, 6 main levels | 12 | 6 × 2 |
| Platinum Tag, 6 main levels | 18 | 6 × 3 |
| Boss No-Hit medal, 5 bosses (L6 has none) | 15 | 5 × 3 |
| Boss Speed medal, 5 bosses | 10 | 5 × 2 |
| Remix Golden Bone, 6 main levels | 18 | 6 × 3 |
| Perfect Run relic, 6 main levels | 12 | 6 × 2 |
| Boss Rush clear / no-hit | 6 | 3 + 3 |
| Box Gauntlet medals, G1–G3 (clear, all boxes, no deaths) | 9 | 3 × 3 (box-gauntlets-spec 4.2) |
| **Total** | **100** | 12 + 18 + 15 + 10 + 18 + 12 + 6 + 9 |

Mastery items for content that isn't shipped count 0 and aren't listed. The mastery cap shrinks with
them.

```js
export function goodBoyPercent(save, reg) {
  const base = basePoints(save, reg), baseMax = basePointsMax(reg);
  const basePct = baseMax ? Math.floor((base / baseMax) * 100) : 0;   // floor: never shows 100% early
  const mastery = masteryPoints(save, reg);                           // 0..100
  return { base: basePct, mastery, total: basePct + mastery };
}
```

**Worked example** (everything shipped: 6 main levels, both bonus stages, 54 dogs):

- Base:
  - L1–L3 beaten: 3 × 4 = 12.
  - Bones: L1 golden + goodBoy + snack1 + snack2 = 4; L2 golden = 1; L3 none. That's 5.
  - Bonus: ride golden = 1.
  - Colored bones: red = 1.
  - Dogs: 17 freed, `floor(17 / 3)` = 5.
  - Milestones: jukebox (8) and buddy (16) = 2.
  - Total: 12 + 5 + 1 + 1 + 5 + 2 = 26 of 95, so `floor(27.37)` = **27%**.
- Mastery: 1 gold tag = 2.
- Total shown: **29%**.

### 9.2 Where it shows

- On the map header: `GOOD BOY 34%`.
- In the Kennel.
- On the credits line, which replaces `Golden Bones: x/3` (`game.js` ~854) with `Good Boy %: 34%`.

### 9.3 Secret ending

- **Condition:** `beaten['5'] && goodBoyPercent(save).total >= 80`. L5 is last in play order, because it
  opens after L6.
- Checked when the Pump Queen is beaten and again on entering the map. If it is met and the ending
  hasn't been seen (`save.data.secretSeen`), play it. Otherwise the map says: `GOOD BOY 72% · reach 80%
  for the true ending`.

---

## 10. Tickets: guardrails and the per-level budget

### 10.1 Rules in code

- Every new pickup calls `tickets.add` for static tickets, or `tickets.spawnFlying(..., source)`.
  **Nothing writes `save.data.tickets` directly** except the existing `addTickets()` path.
- New repeatable sources (L4 rolling oranges) use `source: 'coconut'`, so they share the existing
  `COCONUT_CAP_PER_CLEAR`. Don't add a second cap.
- No Ticket payouts for bones, medals, milestones, chains or the Kennel.
- Boss arenas: the arena `k.tix` placements stay at today's counts (L1 arena: 7). New arenas (Titan,
  Queen) get at most 7.

### 10.2 Measuring today's maximum (procedure)

`T.budget()` runs on a fresh ordinary stage after `T.go(id)`. It uses
`measureTicketBudget(stage, tickets, declared.arena)` and reports discrepancies with the static
`BUDGET` declaration. Arena counts are independently measured by the real-builder test. Trial,
remix, rush, boss and development-strip contexts are excluded.

The original sample counter omitted trampoline Tickets and non-Ticket-prize Bark Rocks, counted
Mystery's inherited pack payload twice, and always added coconuts. The implemented counter corrects
those omissions. It counts every authored paying pack, including non-countable packs and the Treat
Tray's synchronously built contents. Default Zipped pays eight **total**, not eight plus two. Custom authored values below three still have a three-raw maximum through the three-hit payout floor. Random plain
packs use five, authored packs use `authoredTickets`; Mystery is excluded from both pack subtotals
and contributes nine raw per slot. Trampolines use `ticketsMax`, every Bark Rock pays its declared
Tickets, and Good Boy/red/blue jackpots count once. Coconut's shared 15-whole allowance applies only
when an actual roller exists. Ordinary stage and arena raw are added **before** rounding down.

### 10.3 Measured layout-1 baseline

Measured from actual level and arena builders at `aa226096ec1382687a86c9eb6d24ad41f817acd9`
(H06, H00–H04b merged), with rendering-only assets/decor mocked. Both minimum and maximum random
rolls give the same conservative declared upper bound. Tests run authoring, entities, track and
collision setup unchanged; this is an economic upper bound, not a recorded perfect playthrough.

| Stage | Field | Plain max | Zipped total | Jackpots | All Bark Rocks | Trampolines | Arena raw | Raw total | Coconut whole | Whole max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| L1 | 112 | 150 | 16 | 27 | 10 | 10 | 7 | 332 | 15 | **125** |
| L2 | 90 | 90 | 0 | 15 | 15 | 0 | 7 | 217 | 0 | **72** |
| L3 | 52 | 60 | 8 | 12 | 10 | 0 | 7 | 149 | 0 | **49** |
| Roomba Rush | 55 | 35 | 8 | 0 | 0 | 0 | 0 | 98 | 0 | **32** |
| Glowworm Grotto | 39 | 55 | 16 | 0 | 15 | 0 | 0 | 125 | 0 | **41** |

H12 adds two Mystery slots to each of L1–L3: +18 raw each, giving **131 / 78 / 55 / 32 / 41** whole
maximums. L1's pre-Mystery measured baseline remains the density anchor; the new slots must not
silently inflate every level's cap. The cap and formula decisions are listed in
[`h12-review.md`](h12-review.md) and require owner sign-off before merge.

### 10.4 Caps (proposal; owner signs off, plan risk 5)

Measured density is `(125 - 15) / 3.13 = 35.14376997` whole per 100 metres.
The rewards formula is `ceil(density × mainPathMetres / 100)`, plus 15 **only** for rollers.

| Level | Layout-1 density cap | Proposed current fixed cap | Future rewards-density cap |
| --- | ---: | ---: | ---: |
| L1 | 125 | **131** | 205 |
| L2 | 107 | **107** | 183 |
| L3 | 86 | **86** | 148 |
| Roomba Rush | 110 | **110** | 166 |
| Glowworm Grotto | 89 | **89** | 134 |
| L4 (rolling oranges) | — | — | 184 |
| L6 (no rollers) | — | — | 159 |
| L5 | — | — | 162 |

L1's current proposed cap explicitly adds the six whole Tickets from its two required Mystery
slots, because density alone gives 125 and would reject H12's actual 131. This is a proposal,
not implicit approval. Future existing-level values do not replace current caps until their
individual extensions are reviewed and signed off. The extension spec §1.7 instead proposes
layout-1 maximum × path ratio, rounded up to five, then three per Mystery slot. These materially
different options, and L6's separate proposed 60 cap, require an owner choice; see the review.
Checkpoint snapshots preserve partial Zipped/trampoline payloads so pre-checkpoint drops cannot be paid again after death. No code automatically increases a cap to match content. `LEVEL_END_MAX_AMOUNT = 20` and
`CARRY_MAX = 100` remain unchanged.

### 10.5 Static declarations and actual-builder verification

Each level re-exports a frozen `BUDGET` from `src/levels/data/budgets.js`. Pure math imports only
that data and the Ticket config. Fields `field`, `packs`, `zipped`, `jackpots`, `bark`, `trampoline`
and `arena` are raw Ticket maxima; `mystery` is a slot count; `coconut` records whether rollers exist.
`ticketBudget` applies the one shared allowance and rounds stage+arena raw together.

`tests/level-budget.test.js` also builds every real stage and arena, measures those actual sources,
and compares every component with the declaration. It tests minimum/maximum rolled packs, authored
non-countables, and an injected extra payout that must exceed the immutable cap. A static copy of
numbers alone cannot make this test pass after authored content changes. `T.budget()` uses the same
measurement, reports component differences, and includes the independently tested arena raw.

---

## 11. DDA ladder

### 11.1 Pure function (`src/game/dda.js`)

```js
export const DDA = { mask1: 3, slow: 5, pityCp: 7, mask2: 9, hazardMul: 0.92, bossDeaths: 3, bossTele: 1.15, bossWindow: 0.3 };
export function ddaFor(deathsAtCp, ctx) {
  if (ctx.trial || ctx.remix || ctx.rush) return { masks: 0, hazardMul: 1, pityCp: false };
  return {
    masks: deathsAtCp >= DDA.mask2 ? 2 : deathsAtCp >= DDA.mask1 ? 1 : 0,
    hazardMul: deathsAtCp >= DDA.slow ? DDA.hazardMul : 1,
    pityCp: deathsAtCp >= DDA.pityCp,
  };
}
export function bossDda(stageDeaths, ctx) {
  if (ctx.trial || ctx.remix || ctx.rush || stageDeaths < DDA.bossDeaths) return { teleMul: 1, windowAdd: 0, masks: 0 };
  return { teleMul: DDA.bossTele, windowAdd: DDA.bossWindow, masks: 1 };
}
```

- God mode gets the same table (deaths can't happen, so it never triggers).
- **DDA never touches bones.** It isn't an input to `runBones`.

### 11.2 Applying it in `respawn()`

`respawn()` already increments `deathsAtCp` and calls
`this.setMask(this.deathsAtCp >= 3 ? 1 : 0)`. Replace that line with:

```js
const h = ddaFor(this.deathsAtCp, rewardCtx(this));
this.setMask(h.masks);
this.dda.hazardMul = h.hazardMul;
if (h.pityCp) this._activatePity();
```

- **Hazard slow-down:** entities marked `this.hazard = true` (chase pursuers, `CoconutRoller`,
  `Crusher`, `SwingHammer`, `FlipPlank`, rising hazards, rug-pull chains) get scaled time.
  `Stage.update` (`stage.js` ~284) loops over the entities. Pass
  `e.hazard ? dt * session.dda.hazardMul : dt`.
  - The `ChaseCat` and `Chaser` speeds and the crumble delay scale through the same `dt` (a slower
    clock).
  - Enemies are **not** slowed, which keeps reading their patterns consistent.
- **Reset:** `checkpoint()` sets `deathsAtCp = 0` (it already does) and `dda.hazardMul = 1`.
- **Pity checkpoint:** `k.pitySnacks(x, y, d)` places a dormant `PitySpot` entity (invisible, no
  collision).
  - `_activatePity()` finds the first dormant `PitySpot` with `d > cp d` and `d <` the next real Snacks'
    `d`. It replaces it with a real `Snacks` (`stage.add(new Snacks(...))`) and a smoke puff.
  - It is silent: no banner.
  - Once used, it stays a Snacks for the run. A rollback to an earlier checkpoint doesn't remove it
    (it's help).

### 11.3 Worked example

- Five deaths at the lily pond: the first two respawn with 0 masks, the 3rd and 4th with 1 mask, the
  5th with 1 mask and hazards at 92%.
- Seventh death: the pity Snacks appears halfway through the section.
- Reach the pity Snacks: it is a checkpoint, so `deathsAtCp` is reset and hazards are back to 100%.

### 11.4 Bosses

- `session.bossStageDeaths` is incremented in `onPlayerDeath` when `phase === 'boss'`, and reset to 0
  in `onBossPhase()`.
- In `respawn()`'s boss branch: `const bh = bossDda(this.bossStageDeaths, ctx); this.boss.dda = bh;
  this.setMask(Math.max(h.masks, bh.masks));`.
- `Boss` reads `this.dda.teleMul` and `this.dda.windowAdd` where it reads the `BOSS` table's `tele` and
  `window` (bosses spec), defaulting to `{ teleMul: 1, windowAdd: 0 }`.
- If boss DDA is active, the Speed medal for this fight is void (12.2).

---

## 12. Mastery layers

### 12.1 Platinum Tag

- `TRIAL_TARGETS` (`src/config/trials.js`) gets a fourth number: `[gold, silver, bronze, platinum]`.
- `trialMedal(level, t)` checks platinum first:
  `t <= g[3] ? 'platinum' : t <= g[0] ? 'gold' : ...`.
- First-pass platinum values (seconds). Each is about the dev-best time + 5%. Set them from recorded dev
  runs before release.

  | Level (play order) | Layout 1 (now) | Layout 2 (extended, about 6.3 m/s over the new length) |
  | --- | --- | --- |
  | 1 | 50 | 86 (540 m) |
  | 2 | 47 | 82 (520 m) |
  | 3 | 41 | 70 (420 m) |
  | 4 | – | 76 (480 m) |
  | 6 | – | 71 (450 m, start to goal) |
  | 5 | – | 73 (460 m) |

  The levels spec owns the final gold, silver, bronze and platinum numbers. These are first passes so
  the medal logic can be tested.

- Every platinum target must be above the hub floor (`TRIAL_FLOOR_MS`); the test checks this.
- **L6 trial:** the run ends at the L6 goal instead of a boss gate. `_finishTrial()` is called from
  `reachGoal()` when `this.trial`. The trial is local only until the hub adds a variant for level 6,
  as for L4 and L5.
- UI:
  - `MEDAL` in `game.js` gains `platinum: '💎'`.
  - `trialDone` names: `PLATINUM TAG!`.
  - The target hint line adds `💎 m:ss.cc` **only after gold is earned**, so new players aren't put
    off.
- The hub stores times, not medals, so nothing changes on the hub side. `sanitizeTrial` recomputes the
  medal from `best`, so a save that already holds a time under the platinum target shows platinum
  straight after the update. That is intended.

### 12.2 Boss medals

- At `startBoss()`, after `boss.start()`: `this.bossRun = { t: 0, noHit: true, void: false }`.
- In `update(dt)`, when `phase === 'boss' && !this.busy && boss.active`: add `dt` to `bossRun.t`.
  Cinematics and dialogue set `busy`, so they don't count.
- `onPlayerHurt()` (called from `Player.hurt()` when it returns true, and from `Player.die()`) sets
  `bossRun.noHit = false`. A mask absorbing a hit **counts as a hit**.
- Boss DDA activating (11.4) sets `bossRun.void = true`.
- In `onBossDefeated(boss)`, unless god mode or Wizard Hat applies (the hat skips the fight entirely,
  so nothing is awarded):

  ```js
  const m = save.data.bossMedals[key] ||= { clear: false, noHit: false, speed: false, bestMs: null };
  const ms = Math.round(this.bossRun.t * 1000);
  m.clear = true;
  if (this.bossRun.noHit) m.noHit = true;
  if (!this.bossRun.void && ms <= BOSS_SPEED_MS[key]) m.speed = true;
  if (!this.bossRun.void && (m.bestMs == null || ms < m.bestMs)) m.bestMs = ms;
  ```

- `BOSS_SPEED_MS` (first pass, in `config/difficulty.js`):
  `{ bird: 75000, cat: 85000, cone: 120000, titan: 130000, queen: 170000 }`.
- Respawning in a boss fight **doesn't reset** `bossRun.t`. The time covers the whole fight, deaths
  included, so a death almost always costs the Speed medal.
- **Map UI:** a boss list in the map panel when a level is selected, after the level is beaten:
  `MECHA BIRD ✓ · No-Hit ✗ · Speed 1:12 / 1:15 ✓`.
- Banner on defeat for a new medal: `NO-HIT MEDAL!` / `SPEED MEDAL!`, sound `'stamp'`.

### 12.3 Perfect Run relic

- **Condition:** in one run of a main level (L6 included), every countable breakable broken, every dog
  freed and `deathsAtGate === 0`. Not in god mode, a trial or a remix.
- Checked at the gate and banked at `levelCleared`: `perfect[id] = true`.
- Map: a paw stamp over the level node.
- Tally: shown as an extra stamp after the board, `PERFECT RUN!`, sound `'invincible'`.
- The missed-backpack rain already shows `PERFECT!` when nothing was missed. With 0 deaths and all
  dogs freed, change that banner's subtitle to `...and not a single death! PERFECT RUN`.

### 12.4 Remix bones (M5)

- A remix Session (`session.remix = true`) records only `remix[id].golden`, using the same Golden rule.
- `runBones` returns null for remixes, so the normal board is untouched.
- The remix map node shows its own single bone.

---

## 13. Tuning tools (dev only, `src/dev.js`)

### 13.1 Death heatmap

- In `Session.onPlayerDeath(type)`, when `import.meta.env.DEV`, push
  `{ level, d, x, cause: type, t: Date.now() }`:
  - `d` and `x` come from `track.project(player.pos.x, player.pos.z)`.
  - The list goes to `localStorage['nobu-dev-deaths']`, capped at 2000 entries with the oldest dropped.
- `?heatmap` in the URL, or `T.heatmap(true)`, draws a red sprite (0.4 m, opacity 0.5) at each stored
  death for the current level. Redrawn on `startLevel`.
- `T.deaths(level)` returns counts grouped by `k.section` name: `{ 'Lily Pond': 12, ... }`.
- `T.clearDeaths()`.

### 13.2 Section timers

- In `update(dt)`, when DEV, find the current section from `player.body.s` and accumulate
  `secTime[name] += dt`.
- At the gate, `console.table` the times plus deaths per section, and append them to
  `localStorage['nobu-dev-sections']`.
- **Use:** compare against the 30-second section target and the death targets in plan 4.4. Adjust
  `TIER` numbers, not entity literals.

### 13.3 Playtest protocol

- 3 first-time players per level, no instructions beyond the in-game tutorials.
- Record the median deaths per level and per section, and the time per section.
- If the median is above the plan 4.4 target band, lower that level's tier by 0.5 (interpolate the
  `TIER` rows), and re-test. Below the band, raise it.
- Write the results into a dated `docs/playtest-YYYY-MM-DD.md`.

---

## 14. Interaction matrix

| | Chain | Mystery | Bones | Dogs and Kennel | DDA | Medals |
| --- | --- | --- | --- | --- | --- | --- |
| **Checkpoint rollback** | Chain reset; chain-drop spheres removed | Restored; spawned items removed; the same roll comes back | `snack.raw` restored from `cp` | `freedIds` restored from `cp` | Counts from `deathsAtCp` | Boss time keeps running |
| **Death** | Reset | — | `deaths++` (Good Boy) | — | Ladder step | No-Hit lost |
| **Treat Tray lost** | Reset | n/a (none in trays) | `snack.raw` restored from the round snapshot | — | — | — |
| **Time trial** | Counter only, no sphere, not saved | Becomes a plain backpack | Not awarded | Not saved | Off | n/a |
| **God mode** | Normal | Normal | Golden, Hidden and Snack only | Saved | n/a | Not awarded |
| **Wizard Hat** (bosses skipped) | Normal | Normal | Normal (the level clears) | Saved | Normal | Not awarded (no fight) |
| **Multi-tab** | — | — | OR / max merge (1.6) | Union | — | OR / min merge |
| **Hub Ticket queue** | No Tickets | 3 whole Tickets go through `addTickets`, so they are banked by the normal `hub.bank` | No Tickets | No Tickets | — | No Tickets |
| **Game over → continue** | New run | New `runSeed` | New run | Not saved until a clear | Fresh | New fight |
| **Ride stage (Roomba)** | Timer always runs | Allowed | 3-slot board | Saved | Normal | n/a |

---

## 15. Copy strings

Gather these in `src/story/script.js`, in a new `REWARD_TEXT` export, so they are in one place.

| Key | Text |
| --- | --- |
| `chainSphere` | `CHOMP CHAIN x8!` / `Sproto Mask!` |
| `chainBest` | `NEW BEST CHAIN` |
| `mysteryCat` | `SURPRISE!` / `RUN!` |
| `mysteryTickets` | `MYSTERY!` / `+3 Tickets` |
| `hiddenBone` | `HIDDEN BONE!` / `Shhh... it's a secret` |
| `boneGolden` | `GOLDEN BONE` |
| `boneGoodBoy` | `GOOD BOY BONE` / `{n} deaths` |
| `boneHidden` | `HIDDEN BONE` |
| `boneSnack` | `SNACK BONE {I | II | III}` / `{pct}% of Tickets` |
| `perfect` | `PERFECT RUN!` / `Every backpack, every dog, no deaths` |
| `kennelNew` | `KENNEL: {UNLOCK} UNLOCKED!` |
| `kennelGolden` (Sproto Mask) | `Every. Single. Dog. Nobu, the island owes you a lifetime supply of belly rubs.` |
| `gatedHint.dust` (before the Titan is met) | `A DUST WALL. Something in the Owner's House could break this...` |
| `gatedHint.dust` (after) | `A DUST WALL. Slide, then BITE mid-slide to DUST DASH through it.` |
| `gatedHint.moon` (before / after) | `Way too high... for now.` / `A MOON LEDGE. Hold JUMP to charge a MOON JUMP.` |
| `gatedHint.zoom` | `A ZOOMIE GATE. Hit the plate and SPRINT.` |
| `gatedHint.smog` | `A SMOG VENT. Maybe a really loud bark...` |
| `noHit` / `speed` | `NO-HIT MEDAL!` / `SPEED MEDAL!` |
| `secretLocked` | `GOOD BOY {n}% · reach 80% for the true ending` |
| `newGameConfirm` | `Start over? Trial bests, Platinum Tags, boss medals and Perfect Runs are kept.` |
| Map status, board complete | `Board complete! Good boy.` |

The ending line in `ENDING` (`script.js` ~39), `(Golden Bones still waiting, if you're a completionist.)`,
becomes `(The Kennel's still got room, if you're a completionist.)`. That is plan risk 2.

---

## 16. New synth sounds (`src/audio/audio.js`, `play()` switch)

| Name | Recipe (same helpers as nearby cases) | Used by |
| --- | --- | --- |
| `chainUp` | `_osc('square', 660*p, 1320*p, 0.08, 0.1)` + `_osc('triangle', 1320*p, 1980*p, 0.1, 0.06, 0.04)` | Chain 5 and 10, tally Best Chain |
| `stamp` | `_osc('sine', 90, 40, 0.22, 0.6)` + `_noise(0.12, 0.35, 0, 'lowpass', 1200, 200)` | Each bone stamp, medals |
| `sniff` | `_noise(0.12, 0.2, 0, 'bandpass', 1800, 3200, 4)` ×2, 0.15 s apart | Sniffer open |
| `kennel` | the `'invincible'` arpeggio at half volume | Golden Kennel |

Also: `'break'` and `'squash'` take the `p` pitch argument (2.3), and `'blip'` uses `p` for the
rising tally ticks.

---

## 17. Test cases

Each test file is named in plan 10.3. All of them are Vitest, with pure modules only. They use the
`helpers.js` `resetWorld()` that existing tests use.

### `tests/bones.test.js`

| Case | Input | Expect |
| --- | --- | --- |
| Golden needs everything | `stats { breakables: 40, broken: 39, dogs: 5, dogsTotal: 5 }` | `golden: false` |
| Golden earned | broken 40/40, dogs 5/5 | `golden: true` |
| Golden with no breakables | `breakables: 0` | `golden: false` (same as today) |
| Good Boy at the limit | `deathsAtGate: 3` | `goodBoy: true` |
| Good Boy over | `deathsAtGate: 4` | `false` |
| Good Boy in god mode | `ctx.god`, deaths 0 | `false` |
| Snack tiers | `snackTier(84, 212)` / `(85, 212)` / `(128, 212)` / `(170, 212)` | 0 / 1 / 2 / 3 |
| Snack with no potential | `snackTier(5, 0)` | 0 |
| Trial | `ctx.trial` | `runBones` returns `null` |
| Never revoke | board `{ golden: true, snack: 3 }`, run `{ golden: false, snack: 1 }` | board unchanged, `fresh: []` |
| Stamp order | board empty, run `{ golden, goodBoy, snack: 2 }` | `fresh: ['golden', 'goodBoy', 'snack1', 'snack2']` |
| Old map kept in step | golden earned for `'2'` | `save.bones['2'] === true` |
| `nextGoal` priority | 2 backpacks missed in `Lily Pond`, deaths 5 | text names `Lily Pond` (rule 1 beats rule 2) |
| `nextGoal` Hidden gated | hidden missing, `move: 'dust'`, no dust | `you'll need a new move` |

### `tests/good-boy-percent.test.js`

| Case | Expect |
| --- | --- |
| Fresh save, all shipped | `{ base: 0, mastery: 0, total: 0 }` |
| Everything on the base list | `base: 100` |
| Base max weight sum | `basePointsMax(all shipped, 54 dogs) === 95` (24 + 36 + 6 + 5 + 18 + 6) |
| Mastery max | `masteryPoints(everything) === 100`, total 200 |
| Worked example (9.1) | 26 points → `base: 27, total: 29` |
| Only L1–L3 and the bonus stages shipped (17 dogs) | max 46; all shipped items reach 100 |
| Milestones over the shipped total | thresholds 24, 32 and 42 ignored when 17 dogs are shipped |
| L6 in the base | `beaten['6']` gives 4 points; its board gives up to 6 |
| Floor | 94/95 shows 98, never 100 |
| Secret ending | `beaten['5']` and total 80 → `true`; total 79 → `false`; `beaten['6']` without `'5'` → `false` |

### `tests/dda.test.js`

| `deathsAtCp` | Expect |
| --- | --- |
| 0, 2 | `{ masks: 0, hazardMul: 1, pityCp: false }` |
| 3, 4 | masks 1 |
| 5, 6 | masks 1, `hazardMul: 0.92` |
| 7, 8 | plus `pityCp: true` |
| 9, 20 | masks 2 |
| Any, with `ctx.trial`, `remix` or `rush` | all off |
| `bossDda(2)` / `bossDda(3)` | off / `{ teleMul: 1.15, windowAdd: 0.3, masks: 1 }` |

### `tests/mystery.test.js`

| Case | Expect |
| --- | --- |
| Same seed, level and slot | the same id on 100 calls |
| Different slot | ids can differ (fixed seed gives a known vector; snapshot it) |
| Distribution | 100 000 rolls over seeds: each id within ±1.5% of its weight share |
| `tramp: false` | `tramp` maps to `sphere` |
| Rollback | a pure helper `mysteryResult(session-like, slot)` gives the same result after a "respawn" (same `runSeed`) |

### `tests/level-budget.test.js`

- For every level `BUDGET` (10.5): `Math.floor(raw / 3) + coconut <= LEVEL_TICKET_CAP[id]`, with
  Mystery counted as tickets in the worst case.
- `LEVEL_TICKET_CAP` has an entry for every registry id, including `'6'`, with the 10.4 numbers.
- Coconut sources are only declared in levels whose cap includes the coconut allowance.

### `tests/save-migrate.test.js`

| Case | Input (v2 on disk) | Expect after `save.load()` |
| --- | --- | --- |
| Arrays to maps | `beaten: [true, true, false], bones: [true, false, false], bestDogs: [5, 2, 0]` | `beaten: { '1': true, '2': true }`, `bones: { '1': true }`, `bestDogs: { '1': 5, '2': 2 }` |
| Board from bones | the same | `boneBoard['1'] = { golden: true, goodBoy: false, hidden: false, snack: 0 }`; no entry for `'2'` |
| Open from unlocked | `unlocked: 3, beaten: [true, false, false]` | `open` has `'1' '2' '3' 'ride'`, not `cave` |
| Bonus found | `bonus: { cave: { found: true } }` | `open.cave` |
| Dogs approximate | `bestDogs: [3, 0, 0]` | the first 3 L1 dog ids in `dogsFreed` (L1 lists 9 ids in the registry; only the first 3 are marked) |
| Trials untouched | the v2 trials fixture from `save-scores.test.js` | identical `trials` |
| Idempotent | load, write, load | equal objects |
| Bad v3 values | `boneBoard: { '1': { snack: 9 } }`, `dogsFreed: { 'x:y': true }` | `snack: 3`, `dogsFreed: {}` |
| Corrupt | `'{not json'` | `.corrupt` copy is kept (existing behaviour) |

### `tests/multitab.test.js` (additions)

- Disk has `boneBoard['1'].hidden`, mine has `.goodBoy`: after `write()`, both are true.
- Disk `bossMedals.cat.bestMs` 70000, mine 80000: the result is 70000.
- Disk is a **v2** save with `beaten: [true, true, false]` and mine is v3: after the merge,
  `beaten['2'] === true`.

### `tests/registry.test.js` (dog-id parts)

- Every dog id matches `DOG_ID`, is unique within its level, and `dogs` counts match the level budget
  notes.
- `totalDogs` equals the sum of the shipped levels' dog counts, and **54** with every level shipped
  (9 + 7 + 9 + 4 + 4 + 7 + 7 + 7).
- Unlock chain in play order: L4 opens L6, L6 opens L5; L6 has no boss key and grants no move.

### `tests/trials-bounds.test.js` (additions)

- Every `TRIAL_TARGETS[l][3]` (platinum) is above `TRIAL_FLOOR_MS[l] / 1000`, below gold, and positive.
- `trialMedal(1, 49.9) === 'platinum'`; `trialMedal(1, 50.1) === 'gold'` (layout-1 numbers).

---

## 18. Gaps in the plan, and how this spec resolves them

1. **"Seeded per level and slot" (plan 3.3)** would give the same result forever. The seed here is
   **per run**: death never rerolls, a new run does. That keeps the variable reward the plan wants.
2. **Hidden Bone timing.** The plan doesn't say when it is saved. It saves at pickup, like colored
   bones, not at clear.
3. **God mode and bones.** The plan doesn't say. Good Boy, Perfect, medals and Platinum are off in god
   mode; Golden, Hidden and Snack stay on, as the Golden Bone does today.
4. **Snack Bone denominator.** The plan says "% of the level's Tickets." It is defined here in raw
   pickups, excluding coconuts, Mystery, jackpots and Bark Rocks, so the percentage can't be inflated
   and gated content doesn't count.
5. **"Chain counts toward a cosmetic Kennel milestone" (plan 3.2)** became **chain badges**: 5 badges
   unlock the `chompGold` fur tint. The dog-count milestones stay as the plan lists them.
6. **"Off in trials" for the Chain (plan 3.2)** keeps the counter visible, as the plan says, but no
   sphere drops and nothing is saved.
7. **Boss medal versus DDA.** The plan doesn't say. Boss DDA voids the Speed medal for that fight; a
   death already costs No-Hit.
8. **`beaten` keyed by id (plan 10.1)** touches about 10 call sites in `game.js` (`mapOpen`, the map
   draw, the trial key, `levelCleared`, credits) and `player.js` `abilities`. `unlocked` stays a
   number during M0 so the change is incremental, and `open` takes over from M0 on.
9. **New Game** keeps mastery records (medals, Perfect, Platinum) as well as trial bests. The plan
   only names trial bests; this extends the same reasoning.
10. **The secret ending at 80%** uses `total` (base + mastery). The base track alone reaches 80%, so
    mastery is never needed.
11. **Level 6 (owner scope change)** is a main level with no boss.
    - It is cleared at a goal, through the new `goalLevelCleared()`.
    - It counts fully in the base track (story clear plus a six-bone board).
    - It has a trial, Platinum Tag, Perfect Run and Remix bone.
    - It gives no move and no boss medal.
    - Its id stays `6`, though it is fifth in play order.
12. **Kennel thresholds** moved from 5 / 10 / 15 / 20 / 25 / all to 8 / 16 / 24 / 32 / 42 / all, for
    54 dogs. The unlock items and their order are unchanged.
