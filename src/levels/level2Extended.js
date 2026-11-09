import { addMoonReturnExtras, addColoredReturnExtras } from './moonReturnRoutes.js';
import { settleLevel2Tickets } from './level2TicketPayout.js';
import { MOON_RETURN_ROUTES } from './data/moon-return-routes.js';
export const MOON_LEDGES = Object.freeze([MOON_RETURN_ROUTES[2]]);
// Layout2 is active; public uploads remain gated separately by HUB_LAYOUT.
export const ACTIVE = true;
import { LEVEL_BUDGETS } from './data/budgets.js';
export const BUDGET = LEVEL_BUDGETS['2'];
// Level 2: Scratchpost Canyon — the Big Cat chase along a winding canyon. Camera faces Nobu.
// Pits, logs, backpack walls, rugs, yarn, a crumbling bridge, a curving plank bridge and a mushroom launch.

import { makeKit, makeTrack, turtle } from './kit.js';
import { CanyonChase } from '../entities/canyonChase.js';
import { EXTENDED_MOVES, extendedD, EXTENDED_CHASE_ITEMS, EXTENDED_CUTS, EXTENDED_DOGS, CORRECTED_CHASE_ITEMS, CORRECTED_DOGS } from './data/l2-extended.js';
import { buildCanyonSections, installCanyonKit } from './canyonSections.js';
import { SECTION_TEXT } from '../story/script.js';
import { canyonMainSections } from './canyonMetadata.js';
import { L2_CHASE } from './data/l2-chase.js';
import { rand, pick } from '../core/util.js';

export function buildLevel2Extended(game, stage, tickets, {corrections = true} = {}) {
  const track = makeTrack(stage, turtle([0, 0, 30], EXTENDED_MOVES));
  const k = makeKit(game, stage, tickets, track);
  installCanyonKit(k,game,stage);
  const items=corrections?CORRECTED_CHASE_ITEMS:EXTENDED_CHASE_ITEMS;
  const dogs=corrections?CORRECTED_DOGS:EXTENDED_DOGS;

  // track d=0 is 30m into the curve; content below is authored from d=30 onward
  const D = extendedD;
  const END = D(316);
  const HALF = 4.6;
  const W = HALF * 2;
  k.walls([[0, HALF, HALF, 3.2], [END + 2, HALF, HALF, 3.2]]);
  k.backstop(0);
  k.backstop(END);
  const log = (d) => k.log(D(d), { w: W });
  const F = (a, b, o = {}) => k.floor(D(a), D(b), { w: W, ...o });

  F(-30, 36);
  k.tix(0, 0, D(4), 0, 0, D(14), 5);
  log(18);
  k.tix(-2.5, 0, D(21), -2.5, 0, D(26), 3);
  k.tixArc(0, 0, D(34.5), 0, D(41.5), 2.2, 5);
  F(40, 64);
  k.tut(D(44), 'mouse');
  k.mouse(0, 0, D(48), { range: 3.4, speed: 4 });
  k.tix(0, 0, D(51), 0, 0, D(60), 5);
  k.tixArc(0, 0, D(62.5), 0, D(70.5), 2.6, 6);
  F(69, 120);

  k.tut(D(76), 'yarn');
  k.yarn(0, 0, D(80), { range: 3.2, speed: 4.4 });
  log(88);
  k.tix(2.5, 0, D(90), 2.5, 0, D(94), 3);
  k.barkRock(-3.3, 0, D(100), { prize: 'tickets', tickets: 3 });
  k.tix(-2.6, 0, D(103), -2.6, 0, D(112), 5);
  k.pill(0, 0, D(118), { range: 2.8 });
  k.tixArc(0, 0, D(119), 0, D(127), 3.6, 7);
  F(126, 160);
  // blue bone path (the blue bone is up on the fan catwalk in the Cone Factory)
  k.colorPath('blue', [[3.4, 1.4, D(132), 1.6, 1.8], [3.4, 2.8, D(135), 1.6, 1.8], [3.2, 4.2, D(138.5), 2.2, 3]], { jackpot: 3 });
  k.mouse(0, 0, D(138), { range: 3.4, speed: 5 });

  k.tix(2.8, 0, D(148), 2.8, 0, D(156), 5);

  // crumbling bridge: don't stop running!
  k.crumble(-1.5, 0, D(161.6), { w: 3.2, d: 2.8 });
  k.crumble(1.0, 0, D(164.6), { w: 3.2, d: 2.8 });
  k.crumble(-0.5, 0, D(167.6), { w: 3.2, d: 2.8 });
  for (const [x, d] of [[-1.5, 161.6], [1, 164.6], [-0.5, 167.6]]) k.tix(x, 0.2, D(d), x, 0.2, D(d), 1);
  F(169.5, 200);
  k.yarn(-2.5, 0, D(181), { range: 3.2, speed: 5 });
  k.yarn(2.5, 0, D(189), { range: 3.2, speed: 5 });
  k.tix(0, 0, D(176), 0, 0, D(192), 7);
  log(195);

  // curving plank bridge, then a mushroom launch over the big pit
  k.floor(D(200), D(222), { w: 3, style: 'platform', depth: 1 });
  k.tix(0, 0, D(202), 0, 0, D(218), 7);
  k.mushroom(0, 0, D(220.6), { power: 16 });
  k.warp(D(222.5), D(227.5), -4.6, -2.3, 'cave');
  k.tixArc(0, 2, D(221), 0, D(229), 3.5, 7);
  k.floor(D(228), 334, { w: W });
  F(230, 262);
  k.pill(0, 0, D(242), { range: 3 });
  log(256);
  k.tixArc(0, 0, D(261), 0, D(261) + 7, 2.6, 6);
  F(267, 316);
  k.mouse(0, 0, D(275), { range: 3.4, speed: 5.5 });
  k.tix(0, 0, D(279), 0, 0, D(296), 8);
  for (const { kind, x, y = 0, d, height } of items) {
    if (kind === 'stack') k.stack(x, y, d, height);
    else if(kind==='mystery') k.mystery(x,y,d,{slot:0});
    else if(kind==='snacks') k.snacks(x,y,d,{resetChase:!!items.find(o=>o.d===d&&o.kind===kind)?.resetChase});
    else k[kind](x, y, d);
  }
  k.trigger(D(302), () => game.session.reachBossGate());

  // decor
  k.banks(4, END, (x, y, d) => {
    const r = Math.random();
    if (r < 0.3) k.post(x, y, d, rand(4, 8));
    else if (r < 0.55) k.yarnPile(x, y, d);
    else k.rock(x, y, d, rand(0.8, 1.6), 0xc0643a, { strata: true });
  }, { every: 5 });
  k.edges(4, END, (x, y, d) => k.rock(x, y, d, rand(0.3, 0.6), 0xb05a30, { strata: true }), { every: 4 });
  k.grass(4, END, { color: 0xc8a050, every: 1.8, size: 0.85 });
  for (let d = D(15); d < END; d += 34) k.bgDog(pick([-1, 1]) * rand(6, 7), 3.2, d, { height: 1.1 });

  const cat = new CanyonChase(stage, track, D(L2_CHASE.catStart), EXTENDED_CUTS);
  stage.add(cat);
  stage.chaseCat = cat;

  for(const section of canyonMainSections(SECTION_TEXT))k.section(section.d0,section.d1,section.name);
  buildCanyonSections(k, game, stage, cat,{switchbacks:SECTION_TEXT.switchbacks,fort:SECTION_TEXT.cardboardFort,forest:SECTION_TEXT.scratchpostForest,avalanche:SECTION_TEXT.yarnAvalanche,flap:SECTION_TEXT.catFlapAlley,river:SECTION_TEXT.dryRiverbed},{corrections});
  addMoonReturnExtras(k,stage,2); addColoredReturnExtras(k,stage,2);
  for(const dog of dogs){const e=k.dog(dog.x,dog.y??0,dog.d,dog.breed,{id:dog.id});e.detour=!!dog.detour;}
  settleLevel2Tickets(stage, tickets);
  stage.layoutVersion = 2;

  return {
    spawn: k.W(0, 0, D(2)),
    facing: track.yaw(D(2)),
    camera: { mode: 'trackFront', track, height: 6.6, dist: 12.5, behind: 0.5 },
    fov: 64,
    chase: cat,
  };
}

