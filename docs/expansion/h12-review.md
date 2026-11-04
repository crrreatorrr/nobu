# H12 cap and placement review

Source: expansion bundle rewards §§3/10/17/18 and extended-levels §1.7, source branch
`claude/clever-goodall-8221xu` at `fb95a0a8072ebd02202e4b3d045e4e609b335829`.

## Owner decision required before merge

Measured pre-H12 whole maxima: **125 / 72 / 49 / 32 / 41** (L1/L2/L3/ride/cave), including arenas.
The draft procedure missed L1's ten-raw trampoline and ten-raw oneUp Bark Rock, L3's ten-raw Bark
Rock, and seven arena raw per main level. See rewards §10.3 for source breakdown.

Proposed fixed current caps use measured rewards density `(125 - 15) / 3.13` and existing authored
lengths 313/302/243/312/252. L1 additionally needs an explicit +6 for the two required Mystery slots.

| Level | Actual max after H12 | Proposed fixed current cap | Density-only current cap |
| --- | ---: | ---: | ---: |
| L1 | 131 | **131** | 125 |
| L2 | 78 | **107** | 107 |
| L3 | 55 | **86** | 86 |
| ride | 32 | **110** | 110 |
| cave | 41 | **89** | 89 |

Future formula conflict (not authorization to change current caps):

| Level | Rewards density, planned lengths | Extension ratio + Mystery example |
| --- | ---: | ---: |
| L1 | **205** (540m, includes15) | **221** = ceil((125 × 539/314)/5)×5 +6 |
| L2 | **183** (520m) | **131** = ceil((72 × 519/300)/5)×5 +6 |
| L3 | **148** (420m) | **91** = ceil((49 × 419/244)/5)×5 +6 |
| ride | **166** (470m) | **50** = ceil((32 × 459/301)/5)×5 |
| cave | **134** (380m) | **65** = ceil((41 × 370/241)/5)×5 |
| L4 | **184** (480m, includes15) | No layout-1 ratio |
| L6 | **159** (450m, no rollers) | New-level spec separately proposes **60** |
| L5 | **162** (460m) | No layout-1 ratio |

The ratio column uses the pre-Mystery baseline to avoid counting Mystery twice, and shows two
slots/main level, zero/bonus as H12 authors today. Extension ticket authors must substitute their
actual final slot count; a third adds three whole. Applying the ratio to H12's post-Mystery max
and adding slots again would inflate the proposal. Planned END lengths in the rewards table and
true spawn-to-goal path lengths in the extension table also differ; both are shown transparently.

Code presently contains the **proposed** current caps plus future new-level caps4/6/5 from the
rewards-density column. Approval must explicitly cover these values, L1's +6, and the choice of
future formula/L6 exception before affected content merges. No automatic growth or payout clamp.
Chunking20 and carry100 stay unchanged. No hub deployment or board reset is authorized here.

## Layout-1 placement choices

H12 requires two current Mysteries before H30–H32 can implement their future branches. Current
reachable side floors are used, with TODO relocation comments for those extension tickets.
No new floor, movement upgrade requirement, dog or existing pack is moved.

| Level | Slot0 (x,y,track d) | Slot1 (x,y,track d) | Existing side floor |
| --- | --- | --- | --- |
| L1 | (2.9,1.5,48) | (-6,0,166) | Ramp-accessed high road / Bone Switch alcove ground |
| L2 | (3.5,0,D(28)=58) | (3.5,0,D(113)=143) | Right edge beside existing backpack walls |
| L3 | (-3.1,0,15) | (-3.2,0,209) | Intake side / final hall side |

All are optional, on permanent floor, off the central running lane, at least 4m from authored Cats
and Rugs, and have solid ground fore/aft for a Cat escape. No ledge is authored, so trampoline rolls
fall back to Blue Spheres. Real-builder placement tests enforce these properties without boss moves.
The L2 slots sit one metre before existing right-wall packs at D29/D114. The existing final
wall bite uses x3.6 for the full wall and x2.7 for the gapped wall. The Mystery solid stops Nobu
one metre earlier (d=wall-1.84); that same bite still hits the Mystery and the rightmost pack
(and both right packs in the gapped wall). Actual
`Player._interact` tests run the same entity boxes and bite sphere, including a forced Cat roll:
no new stop, bite, lateral trip or movement tuning is required. The existing full wall-maneuver
budget therefore retains its 75% margin and 25m recovery rule. This avoids an analog-only shallow
diagonal route that would have understated keyboard travel time.

A real keyboard opening exposed an existing Mystery bug: the newly appended Cat was processed by
the opening bite during the same live entity scan. Rewards are now added to the current attack's
`bitten` set so the Cat keeps its authored three-second fuse instead of immediately exploding.
This also protects spawned rewards from the opening slide. A later deliberate attack still works. Shared explosions also snapshot their target array so an opening explosion cannot hit its new reward. H10 integrates the corresponding flop target snapshot.


## Partial-payer checkpoint safety

Fresh-level measurements are upper bounds only if checkpoint rollback preserves partial payloads.
Zipped70 could previously pay two raw, checkpoint87, finish, die, restore eight and retain the two.
Trampoline105 had the analogous repeated-bounce exploit. Both entities now capture remaining
payload at `onCheckpoint`, restore that snapshot on a full break rollback, and rewind unbroken
partial changes on respawn. Without a checkpoint they restore authored initial state. Zipped tags
reflect the restored remaining hits. Mystery has no partial payout and keeps its deterministic
restore behavior. H10's merged Session checkpoint calls this optional entity hook. Four integration regressions now construct real Sessions and real Zipped/Trampoline entities, collect payouts through Session.addTickets, and exercise actual checkpoint/respawn methods: successive checkpoints and five full-break/death cycles retain the authored eight/ten-raw maxima; unbroken partial sources rewind before any later checkpoint.

Custom Zipped payloads below three still pay at least three if opened with three individual hits,
so their budget uses `max(3, authoredTickets)` rather than undercounting the first two drops.

## Verification

npm ci passed; 29 test files / 280 tests passed; production build passed (existing large-chunk warning). Rebased onto H10 main 8c503b8; all 23 budget tests pass, including the actual Session payout regressions. Final full checks and independent integration re-review are recorded below when complete. Existing gates tests exercise all five
Mystery outcomes, restore/rebreak stability, lit Cat and trampoline fallback/zero-payout rules.
New Mystery tests add stable seed/slot vectors and 100000-seed distribution tolerance1.5 percentage
points. New budget tests build actual stages/arenas and reject an injected over-cap source.
Browser WebGL verified both L1 slots open, an actual fall death and timed respawn restore them, reopening preserves both results and seed, and a fresh level entry changes the seed. T.budget measured all five real stages with zero declaration differences. Evidence: `/tmp/nobu-h12-browser-results.json`. L2 forced-Cat scripted keyboard probes passed both authored slots: the same wall bite opens Mystery and its rightmost wall pack; the Cat remains alive with its fuse, then explodes after Nobu escapes without damage. The second continuation uses held double-jump over the existing Pill Bot/pit. Evidence: `/tmp/nobu-h12-wall-browser-results.json`; script `/tmp/nobu-h12-wall-browser.mjs`. These are bounded actual-input/runtime checks, not human full-stage play. Full human playthroughs remain unrun.

## Final integrated verification

On H10 main 8c503b8, all 57 files / 567 tests pass; production build and whitespace checks pass. Independent re-review passed all 23 budget tests, including the four real Session checkpoint/respawn regressions, with no technical blocker. Owner approval of the fixed caps remains required before merge.
