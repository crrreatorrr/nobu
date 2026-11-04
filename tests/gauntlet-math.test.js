import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/movement.js';
import { MOVE, simJump, reach, arrowReach, blinkWindow, fallWindow, sliderGapWindow, doubleWindow, fair } from '../src/levels/gauntletMath.js';
const near = (actual, expected) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(expected * .03);
describe('unchanged movement and numeric 60 Hz jump integration', () => {
  it('keeps every movement constant unchanged', () => {
    expect(TUNING).toEqual({ RUN:8, ACCEL:95, DECEL:75, AIR_ACCEL:42, GRAVITY:36, FALL_MULT:1.4, MAX_FALL:28, JUMP:12.6, DOUBLE_JUMP:11.2, COYOTE:.11, BUFFER:.13, SLIDE_SPEED:12.5, SLIDE_TIME:.5, SLIDE_JUMP_SPEED:10.5, BITE_TIME:.34, BITE_RANGE:.95, FLOP_SPEED:30, STOMP_BOUNCE:10.5 });
    expect(MOVE).toEqual(TUNING);
  });
  for (const [move, dy, dist, apex, air] of [
    ['held',0,5.73,2.14,.72], ['tap',0,2.80,.61,.35], ['held',1,5.20],
    ['double',0,10.80], ['bounceTap',0,4.27,1.45,.53], ['bounceHeld',0,5.60,1.97,.70],
    ['bounceTap',1,3.47], ['arrowTap',0,6.53,3.42,.82], ['arrowHeld',0,7.47,4.55,.93],
  ]) it(`${move}, dy ${dy}`, () => {
    const r = reach(move,dy); near(r.dist,dist);
    if(apex)near(r.apex,apex);if(air)near(r.air,air);
  });
  it('a tap cannot climb a box', () => expect(reach('tap',1)).toBeNull());
  it('height and distance double jumps have different timings', () => near(simJump({doubleAt:.38}).apex,3.82));
  it('arrow closed form follows the unchanged gravity', () => {
    near(arrowReach(16,0,false).dist,6.56); near(arrowReach(16,0,true).dist,7.47); near(arrowReach(18,0,false).dist,7.33);
    expect(arrowReach(16,4,false)).toBeNull();
  });
  it('computes beat, crumble and moving gap windows', () => {
    expect(blinkWindow(1.4,1,1,.65)).toBeCloseTo(1.05);
    expect(blinkWindow(.9,.9,.6,.35)).toBeCloseTo(.65);
    expect(fallWindow(.30)).toBeCloseTo(.41);
    near(sliderGapWindow(6,1.6,1.5,4.9),1.63);
  });
  it('derives the actual double window rather than the stale 29 frame prose', () => expect(doubleWindow(3,4)).toBe(27));
  it('interpolates every full and half tier toward the easier requirement', () => {
    expect(fair(1.5)).toEqual({minFrames:27,maxPct:.775,margin:.55,maxActions:3,tell:.55});
    expect(fair(3.5)).toEqual({minFrames:15,maxPct:.89,margin:.35,maxActions:7,tell:.43});
    expect(fair(4.5)).toEqual({minFrames:11,maxPct:.94,margin:.28,maxActions:9,tell:.38});
    for(let tier=1;tier<=5;tier++)expect(fair(tier).minFrames).toBe([30,24,18,12,9][tier-1]);
  });
});
