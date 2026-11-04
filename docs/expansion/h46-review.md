# H46 gauntlets: implementation and review evidence

Source: full H46 ticket, handoff index, box-gauntlets §4/5/8, rewards §1.3/9.1. Based on a561d2f (H30). H40/H32 activation and serial parent Game/registry/host integration remain merge gates. No new media, vendor edits, deployment or permissions.

## Exact placement corrections

The user authorized tested corrections and timer resets. Original recipes remain `GAUNTLET_SOURCE_PATTERNS`; builders consume `GAUNTLET_PATTERNS`. No validator exception, relaxed tier, or altered movement constant.

| Recipe | Source | Runtime correction | Reason |
| --- | --- | --- | --- |
| G1 P2 | packs23/26.4/29.8/33.2 |23/26.2/29.4/32.6; final exit bounce held | tier1 tap limit3.20; final exit3.9 needs held |
| G1 P7 | fall tell .45 | .55 | exact tier1.5 minimum |
| G1 P10 | arrows99/104/109, no rest | add permanent Lunch101.5, route99→101.5→104→109→113 | entry plus3exits counts4 actions; tier1.5 maximum3 |
| G1 P5 | four blink stairs | add permanent Lunch138.25/y1.5 | same approved P5 rest design, maximum3 actions |
| G2 P7 | .38 tell | .43 | tier3.5 easier rounding |
| G2 P16 | .32 tell, tap16 | .40 tell, held16 | tier4 tell and actual reach |
| G3 P3 | final pack26/y.5 |25.8/y.5 | explicit H46 correction; raised5m exceeds tier4.5 |
| G3 P7 | .30 tell | .38 | tier4.5 minimum |
| G3 P16 | .30 tell | .35 | tier5 minimum |

All17 patterns pass strict validation with actual curved-world heights. Distance along the centerline is conservative for chord distance. Slider validators retain actual authored axes/ranges/phases. Counts12/20/12 deliberately exclude the2 ordinary checkpoint Snacks (locally countable=false); PitySnacks are already noncountable. All Backpacks including stacks explicitly pay0raw, no loose Tickets or bonus jackpot. First clear pays5whole once via level_end.

G3 Polaroid exact location was promised but absent from new-levels spec. Parent approved shelfB(2.4,4.2,205), actual existing shelf3×3.4; host overlap proof pending H40 activation. G1(1.4,4.5,175.4) and G2(-2.8,1,65.5) remain source literals before layout splices.

Actual Player bounce bridges passed with normal Backpack.onLand, actual Player.update, input hold/tap and collision; all packs break in one forward crossing without economic payout. Existing TUNING unchanged. Double ladder source29frames is known stale; measured27frames retained, no retune.

## Runtime contracts

Polaroid is separate entity module to avoid shared secrets ownership. It saves immediately, hides after found, rejects any death since level start, trial/remix/rush/medal/board/stickyGod/currentGod, has grey .35 and firstseen fade/banner. No rollback/countable/payer.

Session handles gauntlet goal before normal stat/BoneBoard/rain path. It banks5whole firstPaid once, records clear/allBoxes/flawless(local best>=1000integer), no chain drops or raw pickups, normal lives/checkpoint rollback/clock reset. Cosmetic renderer is called by Session, leaving Player movement untouched. Look cleans owned geometry/materials and restores borrowed model materials when disabled. Kennel wall shows clear photos, gold for Flawless. Existing Save sanitization/OR/min merge/NewGame preservation is reused. Base progress explicitly excludes gauntlets; mastery adds9.

Shared Game/registry/host/kit/map wiring is reserved to parent; contract `/tmp/h46-integration.md`. No main activation until complete integration tests and independent review.

## Verification so far

28 focused tests across2files pass: actual curved Stage builds/countables/zero static budget/grounded Snacks, source negative regressions, actual Session checkpoint rollback+phase reset, one-time5whole transaction, no boards/relic/chain writes; actual Player bridge passes; Polaroid modes/persistence/NewGame; mastery9/base denominator; procedural cosmetic cleanup/competitive hiding and Kennel photos.

Pending: physical arrow/ladder/Glide/roof/Rug/TNT proofs, final shared integration tests, independent review, full npm ci/test/build, bounded browser. No natural full-stage clears or first-player death calibration claimed. Source §8 human targets3–6/6–10/10–16 deaths, tutorial comprehension,3-try fall learning,2-try TNT retreat, audible rhythm and expert Flawless remain manual until actually performed.
