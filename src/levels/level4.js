// H40 builder remains unshipped until the H41 Titan and real arena are integrated.
import * as THREE from 'three';
import { makeKit, makeTrack, turtle } from './kit.js';
import { laundryBoilerPattern, laundryCerealPattern } from './data/laundryRoutes.js';
export { L4_DRUMS as DRUMS } from './data/laundry.js';
export { LAUNDRY_BUDGET as BUDGET } from './data/laundryBudget.js';
import { gateLaundryBone } from '../entities/laundry.js';
import { installLaundryHelpers } from './laundryKit.js';
import { L4_TEXT } from '../story/script.js';
import { houseProp } from '../world/laundryDecor.js';
import { L4_TRACK, L4_WALLS, L4_END } from './data/laundry.js';
import { pick, rand } from '../core/util.js';
export function buildLevel4(game,stage,tickets,{corrections=false}={}) {
  stage.tier=4;
  const track=makeTrack(stage,turtle([0,0,10],L4_TRACK));
  if(track.length<490)throw new Error('Laundry track must cover 490 metres');
  const k=installLaundryHelpers(makeKit(game,stage,tickets,track),game,stage);
  k.walls(L4_WALLS);k.backstop(-8);k.backstop(L4_END);
  const F=(a,b,o={})=>k.floor(a,b,{style:'ground',...o});
  k.section(-8, 50, L4_TEXT.sections.hallway);
  F(-8, 50);
  k.sign(-3.0, 0, 3, L4_TEXT.chainSign, { rot: -0.3 });
  k.sign(3.0, 0, 3, L4_TEXT.biteSign, { rot: 0.3 });
  k.tut(4, 'chain');
  // 8 backpacks in a row, 2 m apart: 0.25 s apart at run speed, far inside the 1.1 s chain window
  k.packs([[0, 9], [0, 11], [0, 13], [0, 15], [0, 17], [0, 19], [0, 21], [0, 23]]);
  k.mouse(0, 0, 26.5, { range: 3.4, speed: 4.5 });                 // chain step 9: easy to keep going
  k.tix(-2.6, 0, 6, -2.6, 0, 22, 7);
  // side table: lunchbox steps up to the first Mystery Backpack
  k.lunch(-3.0, 0, 31.0); k.lunch(-3.0, 0, 32.4); k.lunch(-3.0, 1, 32.4);
  k.mystery(-3.0, 2, 32.4, { slot: 0 });
  k.tut(29.5, 'mystery');
  k.dog(3.2, 0, 35, 'corgi').dogId = '4:corgi-a';                                      // dog 1
  k.rug(1.6, 0, 39); k.rug(-1.6, 0, 43, Math.PI / 2);
  k.dustBunny(0, 0, 44, { range: 2.2 });
  k.tut(42, 'dustbunny');
  k.tix(2.6, 0, 38, 2.6, 0, 47, 4);
  k.snacks(0, 0, 48.5);                                            // checkpoint 1

  k.section(50, 125, L4_TEXT.sections.laundry);
  F(50, 60);
  k.tut(52, 'spindrum');
  k.water(60, 104.5, { w: 12.4, y: -1.4, color: 0xd8ecff });       // soap suds: a fall-out pit
  // Drum 1: slow (one turn per 8 s, 2.5 m/s at the rim). Board at the bottom, step off at the front.
  k.spinDrum(64, { y: 3.2, r: 3.2, n: 4, period: 8 });
  k.tixArc(0, 0.6, 60.5, 0, 67.5, 3.4, 5);
  k.platform(-3.6, 6.6, 67, 2.2, 2.2);                             // high shelf off Drum 1's top
  k.dog(-3.6, 6.6, 67, 'pug').dogId = '4:pug-a';                                     // dog 2
  k.platform(0, 3.2, 71.5, 3, 3);                                  // shelf 1
  k.packs([[-0.9, 71.5], [0.9, 71.5]], 3.2);
  k.pitySnacks(0, 3.2, 72.6);
  // Drum 2: faster (6.5 s, 3.3 m/s), one crumbling platform on the ring (index 2)
  k.spinDrum(79, { y: 3.2, r: 3.4, n: 4, period: 6.5, crumble: [2] });
  k.platform(0, 3.2, 86.5, 3, 3);                                  // shelf 2
  k.pack(-0.9, 3.2, 86.5); k.pack(0.9, 3.2, 86.5);
  // clotheslines: two short ones on the main route...
  k.tut(85, 'zipline');
  k.zipline(0, 5.6, 87.5, 0, 4.0, 93.0);
  k.platform(0, 2.6, 94.5, 3, 2.4);
  k.sphere(1.0, 2.6, 94.5);
  k.zipline(0, 5.4, 96.0, 0, 3.0, 102.0);
  k.platform(0, 1.8, 103.5, 3, 3);
  // ...and a long optional high line over Drum 2, grabbed from its top platform (top at y 6.6, line at 8.6)
  k.zipline(2.6, 8.6, 80, 0.8, 4.4, 102.4);
  k.tix(2.6, 6.85, 82, 0.9, 2.9, 100.5, 8);                        // tickets at the hang height
  F(104.5, 127);
  k.dustBunny(0, 0, 110, { range: 2.6 });
  k.shellback(1.6, 0, 116, { range: 1.2 });
  k.tix(0, 0, 106, 0, 0, 113, 4);
  k.pitySnacks(0, 0, 113.5);                                       // harder pass: no checkpoint here, a pity spot only
  // Detour A: the dryer vent on the right
  k.detour(120, 120, { y: 9.5, x: 3.4, entry: 'pipe', build: buildTopShelf });   // pipe at (3.4, 0, 120); see 3.9

  k.section(125, 180, L4_TEXT.sections.ironing);
  k.floor(127, 130, { w: 2.6, y: [0, 1.2], style: 'platform', depth: 0.6 });
  k.floor(130, 174, { w: 2.6, y: 1.2, style: 'platform', depth: 0.6 });
  k.floor(174, 177, { w: 2.6, y: [1.2, 0], style: 'platform', depth: 0.6 });
  k.tut(126.5, 'iron');
  k.iron(131, 172, { y: 1.2, period: 4.8 });                       // sweeps the whole board and back
  k.fan(0, 1.2, 140, { height: 4.6, power: 26, steam: true });     // steam vents: float while the iron passes under
  k.fan(0, 1.2, 152, { height: 4.6, power: 26, steam: true });
  k.fan(0, 1.2, 164, { height: 4.6, power: 26, steam: true });
  k.tixArc(0, 1.2, 138, 0, 142, 3.6, 4); k.tixArc(0, 1.2, 150, 0, 154, 3.6, 4); k.tixArc(0, 1.2, 162, 0, 166, 3.6, 4);
  k.knight(0, 1.2, 146, { range: 0.8 });                           // narrow board: SLIDE into it
  k.knight(0, 1.2, 158, { range: 0.8 });
  k.pack(-0.7, 1.2, 170); k.pack(0.7, 1.2, 170);
  // Good Boy Route: no deaths by d 128, and golden paws rise beside the board on the left
  k.goodBoy(128, [[-3.0, 0.4, 133, 1.4, 1.8], [-3.2, 1.4, 136.5, 1.4, 1.8], [-3.2, 2.4, 140, 1.8, 3.0]], { jackpot: 15 });
  k.pitySnacks(-2.4, 0, 179);
  F(177, 250);

  k.section(180, 250, L4_TEXT.sections.kitchen);
  k.snacks(0, 0, 181);                                             // checkpoint 2 (132.5 m after checkpoint 1)
  k.tut(183, 'toaster');
  k.toaster(-2.4, 0, 187, { power: 15, period: 2.0 });
  k.platform(-2.4, 4.2, 192, 3, 4);                                // spice shelf A
  k.packs([[-3.2, 190.8], [-1.6, 190.8]], 4.2);
  k.mystery(-3.2, 4.2, 193.4, { slot: 1 });
  k.pack(-1.6, 4.2, 193.4);
  k.toaster(2.4, 0, 200, { power: 15, period: 2.0, phase: 1.0 });
  k.platform(2.4, 4.2, 205, 3, 3.4);                               // spice shelf B
  k.dog(2.4, 4.2, 205.6, 'dalmatian').dogId = '4:dalmatian-a';                             // dog 3
  // oranges roll down the counter (it climbs 1.4 m over d 180–204)
  k.coconuts(244, { until: 208, every: 2.0, speed: 6.8, lanes: [-2.4, 0, 2.4], color: 0xff8a1a });
  k.shellback(0, 0, 214, { range: 1.4 });
  k.sphere(-2.8, 0, 222);
  k.shellback(1.6, 0, 232, { range: 1.2 });
  k.tix(0, 0, 184, 0, 0, 196, 5);
  k.tix(-2.6, 0, 210, -2.6, 0, 236, 9);
  // Cookie Jar bonus round on the fridge top (h 12, no detour overhead here)
  k.tut(224, 'treat');
  k.bonusRound({
    tray: [3.0, 226], h: 12, skin: 'jar',
    plats: [[2.6, 0, 229, 3, 3], [-0.4, 0.6, 232.6, 2.4, 2.4], [-3, 1.2, 236.2, 2.4, 2.4], [-0.6, 1.8, 239.8, 2.4, 2.4], [2.4, 2.4, 243.4, 3, 3]],
    packs: [[-0.4, 0.6, 232.6], [-3, 1.2, 236.2], [-0.6, 1.8, 239.8], [2.0, 2.4, 243.0], [2.8, 2.4, 243.8]],
    tix: [[2.6, 0.2, 229.6, -0.4, 0.8, 232, 3], [-0.8, 1.0, 233.6, -2.6, 1.4, 235.4, 2], [-2.6, 1.6, 237.2, -1, 2.0, 239, 2], [0, 2.2, 240.8, 2, 2.6, 242.6, 2]],
    back: [0, 247],
  });
  // risk and reward: a Cat in front of a backpack wall; one pounce breaks the lot
  k.cat(0, 0, 240);
  k.packs([[-2.4, 240.5], [2.4, 240.5], [-1.2, 241.6], [1.2, 241.6]]);
  k.pitySnacks(-2.4, 0, 218);
  k.snacks(-2.4, 0, 248);                                          // checkpoint 3 (67 m)
  // Detour B: the Pantry, a side lane through the pet flap on the right (see 3.10)
  k.detour(187, 244, { y: 0, entry: 'flap', build: buildPantry });

  k.section(250, 330, L4_TEXT.sections.stampede);
  const S = (a, b, o = {}) => F(a, b, { w: 9.2, ...o });
  S(250, 268); S(271.5, 306); S(309.5, 334);                       // gaps at 268–271.5 and 306–309.5 (3.5 m each)
  k.tut(251, 'stampede');
  k.chase(254, 328, { model: 'model_mini_roomba', scale: 1.4, count: 3, speed: 7.2, catchUp: 1.0, lanes: [-2.2, 0, 2.2] });
  k.cable(262); k.cable(290); k.cable(318);
  k.toys(-2.2, 0, 278, 2.6); k.toys(2.2, 0, 284, 2.6); k.toys(-1.0, 0, 296, 2.8);
  k.packs([[0, 275], [2.6, 292], [-2.6, 300]]);
  // Zoomie Gate short cut: plate at 282, shutter at 304 (22 m), a lane that bridges the second gap
  k.zoomieGate(3.6, 0, 304, { plateD: 282, open: 2.5 });
  k.floor(304, 311, { x: 3.6, w: 1.8 });
  k.tix(3.6, 0, 304.5, 3.6, 0, 310.5, 4);
  k.tix(0, 0, 252, 0, 0, 266, 6);
  k.tixArc(0, 0, 267, 0, 272.5, 2.2, 4);
  k.tixArc(0, 0, 305, 0, 310.5, 2.2, 4);
  k.pitySnacks(-3.4, 0, 288);                                      // chase is 74 m long, so a pity spot is allowed
  k.drone(0, 1.4, 270, { range: 2.4 }); k.drone(0, 1.4, 308, { range: 2.4 });   // harder pass: drones over both gaps

  k.section(330, 400, L4_TEXT.sections.basement);
  k.snacks(0, 0, 333);                                             // checkpoint 4 (85 m; the chase sits between 3 and 4)
  F(330, 346, { w: 7.2 });
  k.dark(336, 398, { radius: 4 });                                 // Lumi nests at 336, 367, 392
  k.smogVent(-2.6, 0, 340, { lift: 6 });
  k.tut(338, 'smogvent');
  k.platform(-2.6, 6.0, 343.5, 2.4, 2.4);
  k.colorBone(-2.6, 6.0, 343.5, 'green');                          // opens the green path in L5 (and the short one in L1)
  // Box Gauntlet G1: Cereal Box Steps. Teach once over the floor, then the real run over a 19 m drop. No other route.
  k.fallBox(0.8, 0.8, 341.5); k.fallBox(-0.8, 1.6, 344.0);        // teach: a miss lands on F(330, 346)
  k.pitySnacks(0, 0, 345.5);                                       // gauntlet start
  k.fallBox(-1.2, 0, 348.2);
  k.blinkBox(1.0, 0.6, 351.6, { on: 1.2, off: 1.0, group: 'cereal' });
  k.fallBox(-0.6, 1.0, 355.0);
  k.slideBox(0, 1.0, 358.4, { axis: 'x', range: 1.6, speed: 1.5 });
  k.blinkBox(-1.0, 1.4, 361.8, { on: 1.0, off: 1.0, phase: 1.1, group: 'cereal' });
  for (const [x, y, d] of [[-1.2, 0, 348.2], [1.0, 0.6, 351.6], [-0.6, 1.0, 355.0], [0, 1.0, 358.4], [-1.0, 1.4, 361.8]]) k.guideArc(x, y + 0.6, d, x, d, 0, 1);
  F(365, 404);
  k.shellback(0, 0, 368, { range: 1.6 });
  k.dustBunny(-1.6, 0, 372, { range: 1.6 }); k.dustBunny(1.6, 0, 373, { range: 1.6 });   // harder pass: a pair
  k.dog(2.8, 0, 366.5, 'shiba').dogId = '4:shiba-a';                                   // dog 4, by Lumi's middle nest
  k.packs([[-2.4, 370], [2.4, 372]]);
  k.squirrel(0, 0, 376, { range: 1.5, ambush: { at: 370, drop: 5 } });
  k.pitySnacks(2.4, 0, 374);
  // left alcove: Dust Wall (Dust Dash, so a replay after the Titan) guarding the Hidden Bone
  k.floor(380, 392, { x: -5.6, w: 3.2 });
  const dustWall=k.dustWall(-4.6, 0, 384, { w: 2.4, h: 2.6 });
  const hidden=k.hiddenBone(-6.2, 0, 386, { move: 'dust' });
  if(hidden)gateLaundryBone(hidden,dustWall);
  // right alcove: a Bark Rock blocks it, and dog 5 is behind it (Mega Bark is guaranteed by L4)
  k.floor(380, 392, { x: 5.0, w: 2.2 });
  k.barkRock(4.8, 0, 384, { prize: 'tickets', tickets: 15 });
  k.dog(5.4, 0, 387.5, 'corgi').dogId = '4:corgi-b';                                   // dog 5
  k.sphere(0, 0, 394);
  k.guideArc(0, 0, 359, 0, 369, 1, 5);
  k.tix(0, 0, 378, 0, 0, 392, 5);

  k.section(400, 486, L4_TEXT.sections.boiler);
  k.snacks(-2.4, 0, 403);                                          // checkpoint 5 (70 m)
  k.tut(404, 'boiler');
  F(398, 408);
  // teach: two blink boxes over the dry floor, before the flood starts
  k.blinkBox(0, 0.8, 404.5, { on: 1.2, off: 1.0, group: 'boil' });
  k.blinkBox(0, 1.6, 406.8, { on: 1.2, off: 1.0, phase: 1.1, group: 'boil' });
  k.camZone(408, 448, 'rise', { dist: 9.5, height: 2.2, lookUp: 3.0 });
  // the flood: starts when you enter at 408, rises 0.6 m/s from -3 to +8, drains once you pass 457
  k.rising(408, 457, { y0: -3, y1: 8, rate: 0.6, trigger: 'enter' });
  k.pitySnacks(0, 0, 409);                                         // gauntlet start
  k.arrowChain([[0, 0, 410.5], [0, 4.2, 415.0], [0, 8.0, 419.5]], { power: 16 });   // up the boiler pipes
  k.platform(2.6, 4.6, 415.5, 1.8, 1.8); k.dog(2.6, 4.6, 415.5, 'shiba').dogId = '4:shiba-b';      // dog 7: a side pipe off chain box 2
  k.blinkBox(0, 8.4, 423.0, { on: 1.0, off: 0.9, group: 'boil' });
  k.slideBox(0, 8.4, 426.5, { axis: 'x', range: 1.6, speed: 1.7 });
  k.fallBox(0, 8.8, 430.0, { delay: 0.4 });
  k.bounceChain([[0, 8.6, 432.8], [0, 10.4, 435.6]]);              // 2 backpacks: each bounce breaks one
  if(corrections){
    const rest=k.lunch(0,11,438.2);rest.laundryRest={x:0,y:11,d:438.2};
    k.arrowChain([[0,12.6,441]],{power:16});
  }else k.arrowChain([[0, 11.0, 438.2], [0, 12.6, 441.0]], { power: 16 });
  k.blinkBox(1.0, 12.6, 444.4, { on: 1.0, off: 0.9, phase: 1.0, group: 'boil' });
  k.fallBox(-0.6, 12.6, 447.8, { delay: corrections ? 0.4 : 0.35 });
  k.zipline(0, 14.2, 449.5, 0, 1.4, 459.5);                        // the long line down to the gate floor
  F(457.5, 492);
  k.guideArc(0, 0.5, 410.5, 0, 415, 4.5, 4);
  k.guideArc(0, 4.2, 415, 0, 419.5, 4.5, 4);
  k.guideArc(0, 8.8, 423, 0, 430, .4, 4);
  k.tix(0, 12.45, 451, 0, -0.15, 458.5, 5);
  k.packs([[-2.4, 464], [2.4, 466]]);
  k.gate(476, L4_TEXT.gate, 0x3a3d44);
  k.trigger(478, () => game.session.reachBossGate());

  k.banks(-6,L4_END,(x,y,d)=>houseProp(stage,pick(d>=330?['pipe','vat','crate']:d>=50&&d<125?['washer','basket','shelf']:['shelf','lamp','pot','books','chair']),...k.W(x,y,d).toArray(),rand(.9,1.3)),{every:5});
  k.edges(-4,330,(x,y,d)=>houseProp(stage,pick(['sock','block','crumb']),...k.W(x,y,d).toArray()),{every:3});
  for(let d=14;d<330;d+=30)k.bgDog(pick([-1,1])*rand(5.4,6.4),2.8,d,{height:1.1});
  for(let d=60;d<=104;d+=5)stage.emitter(...k.W(0,-.8,d).toArray(),'bubble',{r:4.5,color:0xd8ecff});
  for(const d of [412,430,448]){const lamp=new THREE.PointLight(0xff8a3a,3,14);lamp.position.copy(k.W(0,6,d));stage.scene.add(lamp);}
  stage.timedPatterns.push(laundryCerealPattern(stage),laundryBoilerPattern(stage));
  return {spawn:k.W(0,0,1),facing:track.yaw(1),camera:{mode:'track',track,height:4.3,dist:8.6,ahead:5.5}};
}

function buildTopShelf(kd) {
  kd.section(L4_TEXT.sections.topShelf);
  kd.start(3.0, 0.1, 122);
  // outbound (y +9.5 above the path; the ironing board's right-hand pit is below, so a fall is a death)
  kd.platform(3.0, 0, 122, 3, 3);
  kd.platform(2.4, 0.6, 126, 2.4, 2.4);
  kd.mover(2.0, 0.6, 131, { axis: 'x', range: 1.4, speed: 1.4 });  // sliding spice rack
  kd.platform(2.8, 1.2, 136, 2.4, 2.4);
  kd.pack(2.2, 1.2, 136); kd.pack(3.4, 1.2, 136);
  kd.crumble(2.2, 1.2, 140, { w: 2.2, d: 2.2 });                    // jar lids
  kd.crumble(3.0, 1.2, 143.4, { w: 2.2, d: 2.2 });
  kd.platform(2.6, 1.8, 147.5, 3, 3);
  kd.dog(2.6, 1.8, 148, 'dalmatian').dogId = '4:dalmatian-b';                               // dog 6
  kd.snacks(3.6, 1.8, 146.6);                                       // detour checkpoint
  kd.platform(2.6, 1.8, 152, 2.4, 2.4);
  kd.platform(2.6, 1.8, 156.5, 3, 3);
  // turnaround: a steam fan lifts you to the return leg at +4.5 (14 above the path)
  kd.fan(2.6, 1.8, 158.2, { height: 5.5, steam: true });
  kd.platform(-0.4, 4.5, 159, 3, 3);
  kd.returnLeg(124, 160);
  // return (heading back toward the camera)
  kd.platform(-2.6, 4.5, 157, 3, 3);
  kd.zipline(-2.6, 6.2, 155, -2.6, 5.4, 143);                       // lines work in any direction
  kd.platform(-2.6, 4.2, 141, 2.4, 2.4);
  kd.oneUp(-2.6, 4.2, 141);
  kd.mover(-2.6, 4.2, 136.5, { axis: 'x', range: 1.2, speed: 1.6 });
  kd.platform(-2.6, 4.2, 131, 3, 3);
  kd.zipped(-2.6, 4.2, 131, 8);
  kd.platform(-2.6, 4.2, 126, 3, 3);
  kd.tix(2.6, 0.6, 123, 2.6, 1.8, 156, 10);
  kd.tix(-2.6, 4.7, 155, -2.6, 4.2, 127, 8);
  // exit: a line from the return leg down to the laundry floor
  kd.exit(-2.6, 0, 118.5);                                          // within 2 m of the entry at 120: a loop
  // absolute coordinates: from 15.7 above the path at d 124.5 to 1.4 at d 117.6 (hang lands on F(104.5, 127))
  kd.zipline(-2.6, 15.7 - 9.5, 125.5, -2.6, 1.4 - 9.5, 118.6);
}

function buildPantry(kd) {
  kd.section(L4_TEXT.sections.pantry);
  kd.floor(186, 189, { x: 5.25, w: 2.1 });                          // entry bridge through the pet flap
  kd.floor(186, 246, { x: 8.0, w: 3.6 });
  kd.floor(243, 246, { x: 5.25, w: 2.1 });                          // exit bridge
  kd.mystery(8.0, 0, 198, { slot: 2 });
  kd.vacuum(8.0, 0, 206, { axis: 'z', range: 3, speed: 4 });
  kd.packs([[7.2, 214], [8.8, 214]]);
  kd.lunch(8.0, 0, 222); kd.lunch(8.0, 1, 222);
  kd.oneUp(8.0, 2, 222);
  kd.zipped(8.0, 0, 230, 6);
  kd.cat(8.8, 0, 236); kd.pack(7.2, 0, 236);
  kd.tix(8.0, 0, 190, 8.0, 0, 240, 12);
  // decor: cereal boxes along x 5.25 where there is no bridge (not solid; they sit over the pit gap)
}
