# H46 timing handoff from H04d

Use the canonical `PATTERNS` / `TEACH_PATTERNS` and `placePattern` exports; do not copy placements into
an independent validation fixture. Original source layouts remain only in AUTHORED_PATTERNS to prove
that unsafe values fail. The owner approved H04d's tested corrections on2026-11-04 and separately
approved P5's added permanent rest (x0,y1.5,dd8.25) with “Add the permanent rest.”

The validator conservatively counts both the initial timed landing from a permanent rest and the exit
to the next rest. Temporary boxes are never rests. Rows that can be run continuously do not count each
footstep as a separate timed input. No tier thresholds or physics constants were relaxed.

When authoring actual G1, test its full absolute layout and sequence. The written G1 P10 relay has
three arrow boxes, so entry+two relays+exit appear to require four timed actions against G1.5's limit
of three. This is a future H46 design issue to verify with the actual stage data, not an approved
layout change. One possible additive rest at d106.5,y0 between arrows104 and109 preserves all three
arrows, but it needs its own actual-stage validation and any required owner decision. Do not silently
apply this suggestion. The normal P5 rest maps to d138.25,y1.5 in the written G1 Blink Stairs segment;
again validate the actual G1 sequence rather than assuming offsets alone establish acceptance.

Keep exact half-tier reach .775 for G1.5. The fixed60Hz double-jump +3m/4m window is27frames; the
source's29 is stale. The source blink negative fixture(.5,1,.5,.72) has .28s, not zero; it still fails
tier1's30frame limit. Both facts are tested without movement retuning.

All16 normal patterns and16 teaching variants have a dev strip (`await T.boxes()` or
`await T.boxes({teach:true})`), selected via `T.boxAt('P5')`. `T.gauntletCheck()` validates the same data.
Human controller clears of every pattern, first-time-player difficulty and full camera/readability
verification remain unrun; H04d has automated physics, collision, lifecycle and browser runtime evidence.
