# H51 review and verification

The candidate adds the four-stage Pump Queen, her dedicated candle arena, earned Moon Jump, and the Queen completion/true-ending flow. H50 owns Level 5 authoring and activation; this change exports `buildBoss5Arena` without exposing an unfinished chapter.

## Geometry and compatibility decisions

The source's literal pumped base height of 9 m plus a 5.2 m crown offset contradicts its reachable 8–9 m crown route. Preserve the uncontested idle base of 3 m, fit the actual body to 5.5 m, and place pumped crowns at 9/9.52/10.04 m for stages 1–3, accounting for inflation and stage growth. Stage 4 uses an existing inner candle at 1.5 m and visibly crumples the crown to 2.2 m after a Dust hit. No central floor was added. These choices follow the owner's authorization to correct tested specification contradictions.

The checked-in `pill_bot.glb` already has skin/bind transforms. Before static autorigging, bake its actual rest-pose vertices into owned local geometry; otherwise the rendered body shrinks to 0.055 m. Both actual-asset paths preserve source buffers, materials, maps and skeletons. Superseded alias resources and the final private rig/crown retire exactly once.

Each live ladder occupies a distinct candle and follows its moving support. Queen ladders hold pump 3; ordinary Pills retain their lifecycle. Every PumpPill uses the specified `11 + 2 * pump` bounce and existing held-jump behavior. A rejected `onDash` contact can explicitly return false to defer the broad-box contact until the Queen's actual disc accepts it; default consumers retain their behavior.

The four Crash targets use opposing inner/outer pairs through the arena centre: the fixed authored candle layout cannot provide four collinear targets on every cardinal bearing. Forced movement and recovery remain bounded to 9 m/s until the analytic wave is rejoined. Ultimate decoys sink 0.8 s after the actual safe pillar settles. Frozen/busy cutscenes pause hazardous arena and summon clocks. Mint raises both arms, Pump shows pulsing rings with its rising charge cue, FOMO uses the authored pitch-1.5 charge, Crash emits three warning blips before activation, and safe-pillar chimes repeat steadily. Crate impacts require actual vertical capsule overlap.

Moon Jump charges only earned neutral slide input, with the 0.18 s tap decision, 0.6 s total hold and 18.7 m/s launch. Neutrality uses raw stick magnitude. Existing directional/unearned slides and paid air dash remain intact. Actual gravity apexes are 3.95246 m for ordinary double, 5.70088 m for Crown triple, and 6.58246 m for Moon plus double. A real World test lands on a 6.2 m ledge with Moon; Crown alone cannot land there.

A paid Spell Hat must not remove mandatory earned Mega Bark. Spell Bark continues to skip bosses. Only the Queen's explicit `onEarnedBark` opt-in receives a separate earned base effect after Cone completion: 6.5 m range, .55 cone, 2.5 m vertical tolerance and .9 s successful-cast cooldown. It inherits no paid range/cone/cooldown improvement, never duplicates the ordinary callback, and only pops the shield without damage or rewards.

## Automated and independent verification

Dependency installation passed. The integrated full suite at `4bc91be` passed **91 files / 879 tests**. A subsequent presentation-only closure added one warning-boundary test; **28 focused tests across four files passed** on that final delta. Final-head CI must verify the resulting 880-test suite. Build results are recorded in the PR. Focused Queen/Moon verification at `2e06ece` passed 26 tests, including actual 90-second planner runs for each phase, bounded Ultimate return, summon uniqueness and the physical Moon ledge. Existing Titan/Dust/Cone regressions and actual GLTF lifecycle tests also passed in earlier focused runs.

Independent reviewers approved the arena/Moon/PumpPill components and resource fixes; actual GLTF alias/direct and earned-Bark changes at `eaa145d` (54 focused tests plus an external real-asset probe); final Queen AI at `2e06ece` (26 focused tests plus an external 75-second natural-Ultimate run in all four phases); and root-owned Game ending integration at `4b72041` (16 focused tests plus 3 external cases). These separate approvals do not imply a complete human fight clear.

## Live browser evidence

A real Session, checked-in assets and actual keyboard events were exercised on immutable `2e06ece`. The final artifact is `/tmp/nobu-h51-browser-results.json`; local screenshots are `/tmp/nobu-h51-idle.png`, `/tmp/nobu-h51-wake.png` and `/tmp/nobu-h51-ultimate.png`. Browser and Vite processes were closed after the run. No source changed during the window; no runtime exceptions or external non-GET requests occurred.

- The loaded skinned body measures 5.5 m; idle crown 8.2 m and authored forward orientation are visible with scrolling ticker labels.
- Stages 1–3: moving-candle Pill stomp to crown bite damages once in 49 frames each, with no hurt calls, mask loss or No-Hit loss. The initial descending pose is assisted; deterministic minimum-height tests separately cover every inner candle.
- A natural grounded double jump, landing on the live Pill, bounce and crown bite damages once in 261 frames with no hurt, mask loss or No-Hit loss.
- Stage 4: wait the full wake warning, then keyboard slide/bite Dust Dash from an outer candle crosses to the existing inner support, crumples the crown to 2.2 m and lands an ordinary bite in 35 frames without hurt or mask loss. Deterministic Player tests separately cover all 12 outer starts.
- Full-duration FOMO keyboard countersteering keeps the player alive on the ring at z 11.624–11.807 without hurt or mask loss.
- Ordinary non-Queen PumpPills at pump 0/1/2/3 squash through real Player contact and produce 11/13/15/17 m/s bounces without hurt.
- Crash warns on four targets; airdrops have blue-plus/red-exclamation symbols and descend at 3 m/s; Ultimate has its full 1.5 s tell. Reset restores the correct stage HP, all 16 solids and removes bubble/wake/crumple state.

## Manual verification still unrun

No complete unassisted Queen or Cone clear, blind first-time human discoverability test, median-player 170 s / under-four-minute timing, audio listening pass, colour-blind simulation, or every-ring-position Zoomies/slide-jump/glide escape matrix was performed. The live checks above are bounded mechanic/visual checks, not an unassisted No-Hit clear or human usability sign-off. H50 activation and its complete level-to-boss route remain separate work.
