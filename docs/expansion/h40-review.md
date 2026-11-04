# H40 Laundry Day implementation and review

Work in progress; builder is intentionally unshipped pending the actual H41 Titan/arena.

## Concrete placement corrections proposed for owner decision

The literal Boiler route is instantiated and audited using its built `stage.timedBoxes` and actual curved-track heights. `validatePattern` reports a final Fall contact warning shorter than tier4's0.40s and three transitions after the eighth timed action without permanent rest.

Proposed minimal changes:

1. Replace the first arrow of the final pair, `(x0,y11,d438.2)`, with a permanent plain Lunchbox at exactly the same coordinate. The preceding held bounce reaches it; a normal held jump reaches the remaining arrow at `(0,12.6,441)`. This splits the long timing sequence into legal groups without changing movement tuning or moving either landing.
2. Raise only the final FallBox's contact warning at `(-0.6,12.6,447.8)` from0.35s to0.40s.

The literal proposal fails4checks; the combined correction passes all tier4 reach, landing margin, moving-window, warning, and rest checks. The default builder still uses literal placements until the decision arrives. The explicit fourth-argument `{corrections:true}` candidate instantiates the corrected Lunchbox and FallBox, and its actual built route passes all checks.

The dedicated box spec's Golden Bone rule9 explicitly prohibits economic `k.tix` lines over timing pits. The literal new-levels recipe includes such lines over Cereal and Boiler. Implemented reconciliation replaces those guide lines/arcs with non-economic `k.guideArc`, keeping the two authored bounce packs at one raw Ticket each. The final downward zipline's five hang-height Tickets can remain because it is after the timing boxes. The resulting field budget is121raw and maximum145whole, with7raw arena reserved.

## Other open proof obligations

- Literal left Dust Wall permits walking around at u-6.65, confirmed with actual World/moveBody. Root approved a local collection lock bound to this wall's `broken` state with clear locked visual: the bone is grey/translucent and visibly caged while locked. All collection methods reject until actual Dust Dash contact breaks this wall; positive collection then succeeds. No global Hidden Bone or Dust Wall behavior changed. The right Bark Rock blocks all sampled0.72mwide body approaches, so its position is unchanged.
- Verify Cereal route cannot be skipped using already-owned Glide/Zoomies and Boiler tier4 ceiling rule. Route validation proves jumps on the chosen path; it does not prove lack of bypass.
- Real controller routes, first-time human playtests, and one-run Golden Bone remain unrun. GPU queue has not been entered or bypassed.

## Budget and scope

Literal actual measurement before guide conversion:143field raw,192pack raw,14Zipped raw,15jackpot raw,15Bark raw, threeMystery slots at9raw each, zeroTrampoline; orange CoconutRoller shares the existing15whole cap. Reserving7raw arena pickups gives152whole, below the fixed approved184cap. Test adds121raw to the actual entity list and requires the cap guard to reject the resulting185whole. No dynamic cap growth.

Seven stable dog IDs:4:corgi-a,4:pug-a,4:dalmatian-a,4:shiba-a,4:corgi-b,4:dalmatian-b,4:shiba-b. Built track length492.772m. The explicitly allowed132.5m checkpoint gap is preserved.

Local helper mechanics add no Ticket payers: Iron, steam fan, Dust Bunny splitting and ambush. Oranges remain actual CoconutRoller instances; Cookie Jar entry/exit remain TreatTray instances and their ordinary bonus-round payers are measured. No new media or vendor changes.

H41 arena contract: separate `src/levels/boss4Arena.js`, export `buildBoss4Arena`. Registry/theme/song integration is coordinated separately with the root after H60 shared-file ownership; playable activation requires the real boss and arena.
