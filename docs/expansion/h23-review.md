# H23 Evil Cone powers and arena

Source: H23; bosses-spec4 in full,9.4 and shared1.1/1.2/1.5; gameplay-expansion-plan7.4, from expansion source branch `claude/clever-goodall-8221xu` at `fb95a0a`. Worktree began after H20 merge `09e0e2a9f72fd5b9b7aea3706f183140782d5b6e`.

## Implementation

- Authored stage plans and chains, Shame slow homers, four Rug Pull patterns, Smog Tide, S2 reversing ultimate and S3 two-safe-pedestal ultimate. Every attack retains its own tell; chains remove idle tails and wait through the full grab-miss punish. Player hits cancel continuation through the existing shared grace policy.
- Cone-only ArenaTiles/Pedestal subclasses replace the original floor with36 moving Solids, at6×6/4.2m. Rug shimmer uses the existing `rug` texture only during warning, then tiles drop6m for2s and return over.4s. Patterns never remove more than18 tiles. Ring/cross preserve the standing tile; S3 excludes every tile overlapping a pedestal footprint.
- Four cylindrical pedestals use exact compassr4.2 positions, radius1.6 and height1.2, rising over1s. Existing axis-aligned Solid physics remain unchanged. Smog selects adjacent safe pedestals for the ultimate, so the safe hop is5.94m rather than an opposite8.4m crossing. Unsafe tops sink by.6m; a .0001 contact tolerance makes those authored .6m tops unsafe at the .6m floor boundary.
- Tide warns for1.2×tele, then hurts on the low floor for4s. Two beams lock one pedestal each for.8×tele and fire for.6s, leaving the others usable. The boss hovers over the arena centre during Tide so its own contact body does not occupy a pedestal landing. S3 ultimate spokes are raised to the platform height and damage only within pedestal footprints; they remain jumpable. Cone-rain markers use the targeted pedestal top rather than appearing underneath it.
- Shared `vortex.js` exports `pullToward(boss,strength,dt,{constant,center})`: the original distance-clamped Cone pull/debris, with callers owning death radius/type. It preserves distance return when the player is dead and applies no dead-frame push. H41 can reuse it without duplicating the formula. Root's common overload preserves H20's prior `(player,target,force)` constant-pull API.
- Existing art/audio only. Stage2 cape rug stripes and S3 rim smog trails are procedural/existing-texture visuals. Root supplied central Story/power captions (`3f67a59`), Cone-only M2 config/common overload/tests (`ae7294e`), and actual charge/suck pitch handling (`ebd3680`) directly on this branch. No shared files were edited by this agent.

## Verification

`npm ci` passed with cache `/tmp/nobu-npm-cache`. New Cone tests cover the actual arena builder's7 raw pickups; all pattern/standing/support combinations; real pit collision; exact warning/drop/return timings; phase/reset and mutually exclusive floor attacks; locked beam destinations; actual DDA firing; Shame expiry without biting; the full three-action chain/punish/grace; ultimate reversal/safe pair/longHeat; and both suction API shapes.

The pedestal feasibility test drives the actual unchanged `Player.update` and Solid collision code with keyboard-shaped±1 inputs, normal ground jump plus one ordinary air jump, for all eight directed adjacent hops, with and without Crown:16 successful landings at1.2m. It excludes boss attacks to isolate movement geometry; it is not a full combat playthrough. New attack/arena probes and human playtests are recorded separately below.

Full suite/build, independent review, browser probes and manual checklist status will be filled after final checks. Human110s Speed-target timing and complete bosses-spec4.7 playthrough remain unrun until explicitly recorded. No movement change, new media, vendor edit, deployment or permission change.
