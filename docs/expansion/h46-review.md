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
| G3 ceiling | top9.5 at163,3×6 | constant top12: d163.5,width8.6,length7,depth3 (underface9); d169,width8.6,length4,depth6.5 (underface5.5) | high outer top removes a reachable roof ledge; lower underface contains Double+Glide; wireframe/translucent placeholder keeps default camera readable |
| G3 last receiver | pack(0,1,171.5) | pack(0,2.8,171.5) | lower receivers permit roof-clamped Glide to bypass Slider; normal near-Slider held hop remains valid |
| G1 Pity128 | y0 under descending ramp | y2/3 | actual ramp surface, prevents unsupported checkpoint |

All17 patterns pass strict validation with actual curved-world heights. Distance along the centerline is conservative for chord distance. Slider validators retain actual authored axes/ranges/phases. Counts12/20/12 deliberately exclude the2 ordinary checkpoint Snacks (locally countable=false); PitySnacks are already noncountable. All Backpacks including stacks explicitly pay0raw, no loose Tickets or bonus jackpot. First clear pays5whole once via canonical addTickets(15raw) and level_end, guarded by a one-use goal token; ordinary gauntlet raw pickups remain rejected. Atomic origin-wide claim uses Web Locks or an IndexedDB readwrite transaction; latest durable wallet and monotone records refresh before entitlement. The write is checked for a durable firstPaid receipt before external banking. Current lives/run/checkpoint state is preserved. There is no old-wallet/whole-Save rollback.

No added sidewall platforms are retained: existing Track collision clamps lateral position at every height, and the actual attempted outside+Glide route is contained. The high roof alone was insufficient; its failing late-Double fixture is preserved by the source build. Normal arrowTap→near Slider, Slider→raised pack and pack→goal have physical headroom. The bounded moving-Slider audit covers18 Double press times×4 initial phases, also pressing Glide two frames later; no corrected route in that72-case sweep reaches the receiver without real Slider contact. MovingPlatform solids have no ref, so contact tests compare actual solid identity. This is bounded evidence, not a continuous-state proof.

G3 Polaroid exact location was promised but absent from new-levels spec. Parent approved shelfB(2.4,4.2,205), actual existing shelf3×3.4; host overlap proof pending H40 activation. G1(1.4,4.5,175.4) and G2(-2.8,1,65.5) remain source literals before layout splices.

Actual Player bounce bridges passed with normal Backpack.onLand, actual Player.update, input hold/tap and collision; all packs break in one forward crossing without economic payout. Existing TUNING unchanged. Double ladder source29frames is known stale; measured27frames retained, no retune.

## Runtime contracts

Polaroid is separate entity module to avoid shared secrets ownership. It saves immediately, hides after found, rejects any death since level start, trial/remix/rush/medal/board/stickyGod/currentGod, has grey .35 and firstseen fade/banner. No rollback/countable/payer.

Session handles gauntlet goal before normal stat/BoneBoard/rain path. A shouldCommit guard runs inside the claim lock before Save mutation; quitting while queued cancels entitlement. A claim already committed before disposal still banks once, but post-await screen/player updates require the original current Session. Quota failures retain existing best-effort local feedback yet never bank without claimDurable and attemptDurable receipts. It banks5whole firstPaid once, records clear/allBoxes/flawless(local best>=1000integer), no chain drops or raw pickups, normal lives/checkpoint rollback/clock reset. Cosmetic renderer is called by Session, leaving Player movement untouched. Look cleans owned geometry/materials and restores borrowed model materials when disabled. Kennel wall shows clear photos, gold for Flawless. Existing Save sanitization/OR/min merge/NewGame preservation is reused. Base progress explicitly excludes gauntlets; mastery adds9.

Shared Game/registry/host/kit/map wiring is reserved to parent; contract `/tmp/h46-integration.md`. No main activation until complete integration tests and independent review.

## Verification so far

63 focused tests across4files pass (including2 separate H45 respawn-hook foundation tests). Checks cover actual curved Stage builds/countables/zero static budget/grounded Snacks and Pity spots; literal negatives; actual Session checkpoint rollback+phase reset; canonical15raw→5whole credit and100Ticket life/HUD; no boards/relic/chain payouts; Player bridges, ladder landing+bite, every arrow receiver, earned Glide Drop, Nitro hops with live rotated Rug hitboxes, TNT6/Dock4; roof/raised-receiver negative/positive and72-state moving-sweep+side escape; clocked metronome; Polaroid modes/persistence/NewGame; mastery9/base denominator; cosmetic competitive cleanup/Kennel photos; idempotent owned-material disposal preserving borrowed maps. npm ci75packages passed.

Two independent Save-module instances exercise stale/simultaneous same-stage claims, parallelg1/g2 wallet10, latest spent wallet3→8, medals/reset, IDB/WebLocks fallback and no mutator retry. Actual Session tests verify abandoned versus already-committed disposal and repeat quota failure→reload with zero external bank. Fully unavailable origin locking/storage only retains existing best-effort local behavior; cross-tab/external persistence is not claimed in that environment.

Pending: shared Game/registry/host integration and host overlap tests, independent review, full npm test/build and bounded browser. No natural full-stage clears or first-player death calibration claimed. Source §8 human targets3–6/6–10/10–16 deaths, tutorial comprehension,3-try fall learning,2-try TNT retreat, audible rhythm and expert Flawless remain manual until actually performed.
