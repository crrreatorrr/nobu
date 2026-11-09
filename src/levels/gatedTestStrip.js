// Dev-only builder, loaded on demand by T.gates(). No changes to shipped level layouts.
import { makeKit, makeTrack, turtle } from './kit.js';
import { addGatedHelpers } from './gatedKit.js';

export function buildGatedTestStrip(game, stage, tickets) {
  const track = makeTrack(stage, turtle([0, 0, 0], [[180, 0, 0]]));
  const k = addGatedHelpers(makeKit(game, stage, tickets, track), game, stage, track);
  k.floor(-18, 180); k.walls([[-18, 4.3, 4.3], [180, 4.3, 4.3]]);
  k.backstop(-18); k.backstop(180);
  k.section(0, 45, 'Opening'); k.section(45, 90, 'Smog Path');
  k.section(90, 135, 'Shutter Run'); k.section(135, 180, 'Moon Shelf');
  k.snacks(3, 0, 8);
  k.mystery(3, 0, 12); k.mystery(3, 0, 65); k.mystery(3, 0, 130);
  k.dustWall(0, 0, 20, { gatedBox: k.gatedArea(-1.5, 1.5, 0, 4, 21, 26) });
  k.tix(-1, 0.3, 24, 1, 0.3, 24, 3);
  stage.pityTestSpot = k.pitySnacks(3, 0, 35);
  k.smogVent(0, 0, 55, { lift: 6, gatedBox: k.gatedArea(0.7, 2.1, 5.5, 8, 53, 57) });
  // The shelf sits beside the column, so its underside never caps the lift.
  k.platform(1.4, 6, 55, 1.4, 2.4); k.tix(1.1, 6.3, 55, 1.7, 6.3, 55, 3);
  k.snacks(3, 0, 85);
  k.zoomieGate(0, 0, 115, { plateD: 93, gatedBox: k.gatedArea(-1, 1, 0, 3, 116, 121) });
  k.tix(-0.6, 0.3, 119, 0.6, 0.3, 119, 3);
  k.moonLedge(0, 6.2, 150, { gatedBox: k.gatedArea(-1.2, 1.2, 6.2, 8, 149, 151) });
  k.tix(-0.6, 6.5, 150, 0.6, 6.5, 150, 3);
  return { spawn: k.W(0, 0, 1), facing: track.yaw(1), camera: { mode: 'track', track, height: 4.3, dist: 8.6, ahead: 5.5 } };
}
