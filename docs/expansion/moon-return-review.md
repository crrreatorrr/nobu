# H51 Moon coverage and colored return paths

Candidate based on main c4d6c547. Root approved these tested bounded layouts on 2026-11-04 under the owner's broader tested-correction authorization. No movement tuning changes.

| Stage | Permanent launch `(x,y,d)` | Moon `(x,y,d)` | Minimum actual nearby top clearance |
| --- | --- | --- | --- |
| L1 Canopy | `(-.6,2.70,298.5)`,1.2m square | existing `(2.6,9,301)` |6.232965m |
| L2 Fort | `(0,1.25,262.5)` | `(0,7.5,266.5)` |6.25m |
| L3 Rug Puzzle | `(-3,2.75,80)` | `(-3,9,84)` |6.25m |
| L4 Hallway | `(3,2.75,24)` | `(3,9,28)` |6.25m |
| Roomba Rush Sofa detour | `(-2.6,5,195)` | `(-2.6,11.25,199)` |6.25m |
| Grotto entrance | `(0,2.75,10)` | `(0,9,14)` |6.25m |

These are authored track coordinates. New Moon heights are computed through `k.W` from the launch's actual world height; the table is the resulting authored height on the current track. L1 remains at its original authored Moon9. All platforms are permanently solid and visible before unlock. Each host exports `MOON_LEDGES`, using the same records as the builder. `stage.moonExtras` also records the actual world top and nearest edge distance of every nearby solid. No nearby moving surfaces occur at these six placements.

The raised launch pads are accessible with ordinary Double Jump and avoid changing existing geometry. The original L1 branch2.2 cannot launch a real Moon+Double to Moon9. Its small2.70m pad preserves a rim of the branch for ordinary approach; the initially considered2.75m pad failed the6.2m world clearance rule because the track rolls. L2's nearby Mystery top, Grotto's closed backpacks, and Sofa's closed backpacks invalidate placing their Moon only6.25m above the old floor. L3 has a tested control: a floor-based Moon6.25 is actually reachable using Crown from the existing nearby stack (actual top1.976); Moon9 excludes it. L4's nearby chain/backpack and raised Mystery approach similarly require a higher reward than floor6.25. The new pads sit over existing permanent floor/branch/sofa surfaces, away from mandatory pits and rugs. They add no obstacle, prerequisite or counted object to any original route.

Grotto D10–14 has only its two closed backpack tops at1m nearby; the flipped Shellback atD22 was tested as an adversarial launch. The nearest arrow launch isD42,28m from the Moon centre; mushrooms are in the distant extension atD233+. Sofa's two power9 mushrooms atD182/190 were tested through their actual bounce callbacks. L1's nearby two ziplines were tested at their quarter positions using actual hang jump-off movement and Crown. Higher supports, Backpack/Mystery callbacks, arrow/bounce launchers and Shellback callbacks within28m were tested with Crown, held jump and three steering delays. Their actual absolute apex remains below the selected Moon height, which excludes reaching even its nearest edge.

Every new Moon carries only a noncountable1UP, and L1 retains its original reward. No new Ticket payer, ring, jackpot, Mystery, counted backpack, dog, or Hidden Bone is added. The actual measured Ticket budgets remain unchanged, including L1's fixed205 cap. Tests retain40 dogs (9/7/9/7/4/4) and one original Hidden Bone per stage: L1Burrow, L2CatFlap, L3Ducts, L4Basement, RideSofa, CaveHollow. PurpleL6→L3 remains untouched; L5 and L6 Moon authoring belongs to their owning tickets.

GreenL1's short path sits above the existing floor at `(-3.2,1,32)`, `(-3.2,1.8,35.5)`, `(-3.2,2.6,39)`. YellowL2's path lies in the existing CatFlap detour at `(-1.1,9,150)`, `(-1.1,9.8,153.5)`, `(-1.1,10.6,157)`. Both explicitly use `jackpot:0`; their existing helper gives only a noncountable1UP. Save/load unlock, locked solids, actual outward/backward jumps and no Ticket payout are checked. The missing Yellow palette row is supplied so the future L5 Yellow bone can render.

Copy contract for the Game/Story owners: Green bone onL4 opens **both L5 and L1**; Yellow bone onL5 opens **L2**; Purple bone onL6 opens **L3**. Do not replace the existing L5 Green destination copy with L1 alone. This change does not edit Game/Story.

Automated checks use actual shipped builders, World collision, Player jump/charge/Crown/bounce/hang code and Session Sofa entry/leave. Moon landing passes at60 and120Hz with three steering delays; ordinary Double Jump reaches each pad and walking off each Moon returns to it safely. Sofa Moon remains before the round'sD203 completion boundary and the real Session returns to mainD176. Tests mock rendering/assets/audio only.

Pending manual verification: actual Game's Sofa dismount/remount behavior, camera framing, visual readability and player-controlled complete return visits. No GPU/browser visual verification has been performed for this commit. No deployment is requested or performed.

Validation: full suite ran once:949/950 tests passed across95 files; its only failure was the prior L1 assertion expecting the now-raised branch centre to remain2.2m. The scoped fixture update now checks an ordinary Double Jump from priorD295 to the unchanged physical branch rim `(1.1,2.2,298.5)` and a single jump to the new2.70m pad. The complete L1 file plus36 new checks subsequently passed59/59. Production build passed (existing bundle-size advisory only). No full suite was repeated for that fixture-only closure.

The full suite's actual-builder/arena budget checks passed unchanged. Whole maxima/caps are L1 `203/205`, L2 `151/183`, L3 `100/101`, L4 `145/184`, Ride `62/110`, Cave `58/89`. Raw payer declarations match each actual builder and arena; no cap or declaration was edited.
