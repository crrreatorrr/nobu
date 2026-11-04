# H41 implementation review

The Roomba Titan has three authored attack phases, a living-room arena, shared-vortex suction, furniture/TNT/leg stuns, a flop-only button punish, Lights Out with Lumi, closing-wall ultimate, and procedural intro/defeat animation. Its reward Dust Dash uses bite during a ground slide, independently of the paid air dash. H40 owns the level builder; root activates the registry only when both candidates are ready.

## Specification interpretations

- Dedicated bosses-spec5.6 takes precedence over the shorter new-levels arena summary: floor26×26, walls±13, spawnz9, camera(0,12.5,16.5).
- Furniture pillars stun in every phase, explicitly required by5.3 and5.6. Stage3 walls reflect instead of stunning. The attack-table shorthand does not remove the explicit furniture-pillar rule.
- TNT waits the full six-second respawn. A stage3 charge waits for all three spots to restock, then begins its complete fresh tell; it never resets cooldowns or fires an untold charge.
- The existing vacuum GLB POSITION bounds are x±0.49956435, y±0.31384757, z±0.5. Uniform height1.8 normalization would produce width2.865, conflicting with the six-metre procedural disc. Root approved fitting the consumer clone to6×1.8×6 while preserving tint and independent materials. Global Assets behavior stays unchanged; collision radius is read back from the fitted bounding box.
- A radius-three disc reverses its centre toz−9 to plug its rear into the socket atz−12. Cable and ultimate approaches use bounded driving speed before their complete tells. The yellow warning matches the cable's initial−60° pose.
- Current Vacuum ignores a `chase` option, so the Titan uses a subclass with real World collision while pursuing. Its summons retire on generic checkpoint reset, including old swarms already removed from the boss's live list.

## Dust Dash and top fling

Dust Dash runs at20m/s for.22s, cooldown.8 from start, once per ground slide. Its final partial frame travels exactly4.4m; it resumes with.15s slide remaining. It remains available in trials, breaks a physically approached DustWall, uses existing Knight/Backpack/Shellback handlers, preserves paid air dash charges and restores its own FOV contribution. Boss dash hooks are explicit. Earned Mega Bark reaches the Titan suction callback; paid Spell Bark retains its existing `skip_bosses:true` exclusion.

The unstunned-top fling preserves outward8m/s against ordinary input acceleration until body clearance, bounded by.8s. It changes neither Y nor invulnerability. The Titan suppresses only its own contact during its matching fling; other hazards, mask loss, No-Hit reporting, collision, death and traps remain active. This adds no ceiling/platform that could alter the flop route.

## Verification

Focused tests exercise actual Player and World code: phase-specific jump/flop routes inside the unextended punish windows; model fitting; DDA and lane locking; first wall stun; recharge; reflection bound; cable tell geometry; suction cancellation; landed leg Solids; rug turn warning; closing walls around nearby furniture; real TNT blast/cooldown; lighting rollback; reset cleanup; opposing-input fling escape and unrelated damage; two-second intro and reward-free defeat cosmetics. Actual Session checkpoint coverage includes historical/current swarm cleanup and falling-leg rollback.

Browser artifacts: `/tmp/nobu-h41-browser-results.json` and `/tmp/nobu-h41-dark.png`. The real fallback GLB loads with radius3. Actual KeyUp/Space/KeyK routes punish phases1/2/3 at82–83 frames, with mask1, No-Hit retained and no hurt calls. Closing walls push Nobu around the x9.5 furniture leg to(9.448,0,2.098) without damage. The rear TNT lure stuns stage3 with No-Hit retained. Separate unsafe TNT contact at2m, frozen=false/God=false, consumes the mask and invalidates No-Hit. Three falling-leg Solids appear after their warnings. Lights Out sets sun.12/hemi.3, follows Nobu with Lumi radius4, and the inspected screenshot shows readable lane/LED/fuses. Phase reset restores lights/walls/TNT/HP3. No runtime exceptions.

The browser fixture constructs a real Session directly, without invoking beginAttempt, clears, leaderboard or reward-reporting paths. These assisted probes are not an unaided full clear, a median120-second clear measurement, first-time-player discoverability, or three-user testing. Those manual checks remain unrun and must not be represented as completed. Validation after rebasing onto1635ac8: npm ci passed; full70files/698tests passed. The additional explicit Titan/Cone stage-ladder guard is verified by the focused suite; exact final-head CI remains the merge gate. The production build passes. The existing Wizard Hat contract is Spell Bark target exclusion; no fight-skip behavior is introduced.
