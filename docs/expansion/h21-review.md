# H21 Mecha Bird powers

The Bird alone now consumes its M2 timing and chain rows. Cat/Cone tuning remains unchanged in this
branch's Bird activation commit. The owner's restart policy is preserved: Bird retries from stage1,
including when DDA help for a later phase must be applied again after it is reached.

The plans match bosses-spec2.3. Perch Peck flies to the nearest actual palm, then visibly faces each
lane for a complete per-peck tell. Cage Drop tracks the player until its tell locks, falls in0.35s,
traps for1.2s, and remains four seconds as H20 cage cover. A chained dive waits the full maximum trap
lifetime before its own full aim tell, so slow escape cannot consume that warning. Wind strips push
inward3m/s for3s, off3s (including the opening tell). Their warning uses tele(.6), including DDA.

Two real ConeDrone subclasses orbit at radius2.5,y=Bird.y-.5 and shoot one feather apiece per dive.
Biting gives at most one noncountable Blue Sphere per stage. Retired escorts are removed from the stage
entity list so generic Enemy rollback cannot resurrect an old cohort. Restart removes their drops too.

Eggs retain the specified active fuse2.3/sqrt(sp). Their initial lay tell consumes tele(.5). Exploded
eggs leave radius1.3 ground damage for6s; jumping above0.3 clears it. A Bird-specific adapter ties those
visual/damage zones to Projectiles.clear, without modifying shared projectile logic. Phase/reset clears
remove cages, escorts, craters and marker/beam visuals. Stage1 disables wind lanes.

Ultimate S2 inserts a fully warned laser sweep between waves1 and2. S3 has four waves followed by two
homing rockets, then a guaranteed aim/dive/stuck. Full tells consume the shared tele method; active
shot intervals and sweep durations keep their specified speed scaling. Tired vulnerability is W-.1
after the0.6s landing animation. Root supplied the exact centralized powers/dialogue and synth recipes.

Automated checks cover actual boss states/projectiles, full laser-to-volley and cage-to-aim chains,
phase-specific coconut/wave/rocket counts, low escort rewards, restart cleanup, real trunk collision,
wind cadence/DDA and movement clearance, real egg explosions and crater lifetime/clear.
Geometry: trunks are0.8x6x0.8 at x+/-10.4,z-6, with perch y6.2; all are behind the camera-side z6 line.
Wind strips are3x19 at x+/-5,z-11..8. Even against3m/s wind, moving at8m/s over the0.35s locked-cage
fall clears the1.1+0.36 player margin; the collision test exercises this movement.

Reviewer: inspect attack completion/chain boundaries, cage timing vs H20 projectile timing, escort
reset identity and once-per-stage reward, projectile clear adapter, phase1 wind reset, complete tell
consumption and the ultimate's guaranteed punish. No new media/vendor/permissions/deployment changes.

Verification in progress: npm ci passed; initial focused4files/75tests passed. Browser checks and full
suite/build will be recorded after the candidate review. Human first-try difficulty (<=3 deaths),
natural No-Hit/speed clears, Wizard Hat and Classic Nobu playthroughs are not claimed yet.

Independent review caught a stale H20 cage-cover coordinate: tracking the visible marker did not move
the future collision/beam-cover object. The Bird adapter now moves both the visual target and the
registered cover bounds before lock/landing. A real World regression verifies the moved captive-safe
walls and roof, no stale old-position solids, and actual Beam/feather interception at the new location.
All16 Bird tests pass after that correction; H20 arena tests also pass. The initial full candidate
suite passed47files/511tests and build113modules; final corrected integrated checks remain pending.
