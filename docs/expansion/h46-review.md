# H46 gauntlets: implementation and review evidence

Source: full H46 ticket, handoff index, box-gauntlets §4/5/8, rewards §1.3/9.1. Initially based on a561d2f (H30), then rebased through the released extensions and H51 main c4d6c547. Shared Game/registry/host integration is complete; pre-budget full-suite snapshot is 357d678; final budget completion is 7d7d368. No new media, vendor edits, deployment or permissions.

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

G3 Polaroid exact location was promised but absent from new-levels spec. Parent approved shelfB(2.4,4.2,205), actual existing shelf3×3.4; all three host support/touch-volume checks pass on the shipped builders. G1(1.4,4.5,175.4) and G2(-2.8,1,65.5) remain source literals before layout splices.

Actual Player bounce bridges passed with normal Backpack.onLand, actual Player.update, input hold/tap and collision; all packs break in one forward crossing without economic payout. Existing TUNING unchanged. Double ladder source29frames is known stale; measured27frames retained, no retune.

## Runtime contracts

Polaroid is separate entity module to avoid shared secrets ownership. It saves immediately, hides after found, rejects any death since level start, trial/remix/rush/medal/board/stickyGod/currentGod, has grey .35 and firstseen fade/banner. No rollback/countable/payer.

Session handles gauntlet goal before normal stat/BoneBoard/rain path. A shouldCommit guard runs inside the claim lock before Save mutation; quitting while queued cancels entitlement. A claim already committed before disposal still banks once, but post-await screen/player updates require the original current Session. Quota failures retain existing best-effort local feedback yet never bank without claimDurable and attemptDurable receipts. It banks5whole firstPaid once, records clear/allBoxes/flawless(local best>=1000integer), no chain drops or raw pickups, normal lives/checkpoint rollback/clock reset. Cosmetic renderer is called by Session, leaving Player movement untouched. Look cleans owned geometry/materials and restores borrowed model materials when disabled. Kennel wall shows clear photos, gold for Flawless. Existing Save sanitization/OR/min merge/NewGame preservation is reused. Base progress explicitly excludes gauntlets; mastery adds9.

Shared Game/registry/host/kit/map wiring is integrated: gauntlets stay outside MAP_ORDER, G / RB takes priority over ordinary RB bite-confirm, normal story bookmarks are preserved, and results show only gauntlet medals/best/first-clear reward. The Game result handler never credits or banks a second time.

## Verification so far

63 focused tests across4files pass (including2 separate H45 respawn-hook foundation tests). Checks cover actual curved Stage builds/countables/zero static budget/grounded Snacks and Pity spots; literal negatives; actual Session checkpoint rollback+phase reset; canonical15raw→5whole credit and100Ticket life/HUD; no boards/relic/chain payouts; Player bridges, ladder landing+bite, every arrow receiver, earned Glide Drop, Nitro hops with live rotated Rug hitboxes, TNT6/Dock4; roof/raised-receiver negative/positive and72-state moving-sweep+side escape; clocked metronome; Polaroid modes/persistence/NewGame; mastery9/base denominator; cosmetic competitive cleanup/Kennel photos; idempotent owned-material disposal preserving borrowed maps. npm ci75packages passed.

Two independent Save-module instances exercise stale/simultaneous same-stage claims, parallelg1/g2 wallet10, latest spent wallet3→8, medals/reset, IDB/WebLocks fallback and no mutator retry. Actual Session tests verify abandoned versus already-committed disposal and repeat quota failure→reload with zero external bank. Fully unavailable origin locking/storage only retains existing best-effort local behavior; cross-tab/external persistence is not claimed in that environment.

Completed integration evidence follows below; full npm test/build and exact final CI remain the release gates. No natural full-stage clears or first-player death calibration claimed. Source §8 human targets3–6/6–10/10–16 deaths, tutorial comprehension,3-try fall learning,2-try TNT retreat, audible rhythm and expert Flawless remain manual until actually performed.


## Final integration and browser verification

Clean source 177ba608 integrated the pinned host map entries, G / RB input, actual host Polaroids, ordinary-budget exclusions, dedicated result/pause screens and tempo restoration. The actual Session death/respawn and invincibility-expiry regression proves that gauntlet music returns to1.08 while ordinary levels retain1.0.

A fresh Chromium/SwiftShader browser on frozen177ba608 passed actual keyboard G and pad RB map entry for all three stages; counts12/20/12 and no static Ticket pickups; preserved story bookmark4; supported Laundry Polaroid grey opacity.35 after a death, rejection on touch and actual touch collection after restarting; ordinary death life cost and rate1→respawn1.08; first-clear5whole and repeat0; local record reload; and no ordinary Bone Board or bonus record. Hub calls were intercepted locally: exactly one positive5whole bank was captured and no external write requests occurred. Browser exceptions and console errors were empty. The finale screenshot confirms Nobu, timing boxes and the transparent wireframe ceiling are readable from the unchanged ahead6.5 camera. Artifacts: `/tmp/nobu-h46-browser-results.json`, `/tmp/nobu-h46-roof.png`, `/tmp/nobu-h46-photo.png`, `/tmp/nobu-h46-result.png`. Owned Chrome/Vite processes were closed. An initial harness attempt used a port already occupied by an old H60 server; the successful run used a fresh profile and a verified H46 module endpoint on5276.

The browser used assisted placement and marks boxes broken to test completion transactions. Its local All Boxes/Flawless records are fixture results, not evidence of an unaided full-stage clear. Existing actual Player/World route probes, including72 moving-Slider cases, remain separately attributed above. No first-time human death calibration, audio listening or expert Flawless clear was performed.

Independent final review found and closed a trail double-rotation bug: trails are children of the already-rotated Player root, so357d678 places particles behind its local forward axis. A four-cardinal actual Three.js world-space regression verifies every particle stays behind Nobu. The same commit centralizes all new visible gauntlet names, Polaroid banners, signs and continuation copy in Story; 62 focused tests across3files passed. Independent final review approved this snapshot, the actual Session→Game→map completion/repeat path, and retained the earlier route/resource/transaction approvals. Review: `/workspace/nobu-spec/h46-final-review.md`.


## Final checks and first-clear budget accounting

`npm ci` passed (75 packages), followed by one clean full suite on frozen357d678: **99 files / 990 tests passed**, maxWorkers1,290.85s. Two existing jsdom navigation notices were non-failing. No second full local run was made solely for the later budget correction; exact final-head CI must verify the combined final suite (expected994 cases).

Source review then identified that static pickup measurement omitted the one-time goal reward. Commit7d7d368 adds an optional `firstClearWhole` reserve: only gauntlet builders measure5whole; ordinary measured object shapes remain unchanged and missing reserves mean0. The pure total adds this whole-unit reserve without raw conversion, validates its type/range, and compares missing/zero consistently. All three gauntlets now have declared zero-pickup budgets plus5whole, so the actual developer budget report works and the fixed cap5 is meaningful. Actual builders pass cap5 and fail cap4; malformed reserves fail validation. Runtime credit/banking behavior is unchanged.

The affected four-file run covered83 cases:82 passed and one old declaration-list assertion needed to include gauntlets now that they have declared budgets. The corrected budget suite then passed24/24; the other59 affected cases had already passed. Production build passed on the final budget source (175 modules), and `git diff --check` passed. Independent review approved the narrow budget delta7d7d368 after nine selected actual-builder/type/report checks plus mixed raw/whole/Coconut arithmetic, mismatch and malformed-input probes. Exact final-head CI remains required before merge.
