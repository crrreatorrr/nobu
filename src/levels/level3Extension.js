import { SECTION_TEXT as LABELS } from '../story/script.js';
import { ReversingFactoryBelt, FactoryDetourRecovery, scopeFactoryRoller } from './factoryControllers.js';
import { vatPattern, worldVatPattern } from './data/l3-vat.js';
import { validatePattern } from './gauntletMath.js';
import { placeHiddenBone } from '../entities/hiddenBone.js';
import { shiftL3 as S, shiftL3End as E } from './data/l3-layout.js';

// Transform only original authoring calls. New sections and decor use raw kit.
export function shiftedFactoryKit(k) {
  const out = Object.create(k);
  const point = ['platform','pack','stack','sphere','oneUp','tramp','snacks','cat','rug','lint','zipped','vacSwitch','lunch','arrowBox','broc','spiky','trooper','squirrel','drone','vacuum','mouse','yarn','pill','knight','shellback','dog','mover','crumble','lily','flip','cracked','mushroom','fan','hammer','crusher','barkRock','colorBone','tixRing'];
  for (const name of point) out[name] = (...args) => { args[2] = S(args[2]); return k[name](...args); };
  out.W = (x,y,d) => k.W(x,y,S(d));
  out.floor = (a,b,o) => k.floor(S(a),E(b),o);
  out.belt = (a,b,p,o) => k.belt(S(a),E(b),p,o);
  out.section = (a,b,n,o) => k.section(S(a),E(b),n,o);
  out.packs = (list,y) => k.packs(list.map(([x,d]) => [x,S(d)]),y);
  out.tix = (x,y,d,x1,y1,d1,n) => k.tix(x,y,S(d),x1,y1,E(d1),n);
  out.tixArc = (x,y,d,x1,d1,h,n) => k.tixArc(x,y,S(d),x1,E(d1),h,n);
  out.boneSwitch = (x,y,d,plats) => k.boneSwitch(x,y,S(d),plats.map(([x,y,d,...r]) => [x,y,S(d),...r]));
  out.goodBoy = (d,plats,o) => k.goodBoy(d === 204 ? 379 : S(d),plats.map(([x,y,d,...r]) => [x,y,S(d),...r]),o);
  out.tut = (d,id) => k.tut(S(d),id);
  out.gate = (d,...rest) => k.gate(S(d),...rest);
  out.trigger = (d,fn) => k.trigger(S(d),fn);
  out.backstop = (d) => k.backstop(S(d));
  out.walls = (rows) => k.walls(rows.map(([d,...rest]) => [S(d),...rest]));
  // Relocate the two H12 temporary slots and H11 secret into authored detours.
  out.mystery = () => null;
  out.hiddenBone = () => null;
  return out;
}

export function addFactoryExtension(k, game, stage, tickets, track) {
  // Sorting Belts: permanent floors separate the three conveyor lessons.
  k.section(98,168,LABELS.sorting); k.floor(98,102); k.tut(99,'sorting');
  k.belt(102,120,{x:0,z:3},{x:-2.15,w:4.3}); k.belt(102,120,{x:0,z:-3.5},{x:2.15,w:4.3});
  k.packs([[-2.2,108],[2.2,112],[-2.2,116]]); k.dog(-3.4,0,118,'shiba').dogId='3:shiba-b';
  k.floor(120,124); k.snacks(0,0,122);
  for (const [x,z] of [[-2.9,3.4],[0,-5],[2.9,2]]) k.belt(124,144,{x:0,z},{x,w:2.8});
  k.crusher(0,0,134,{w:2.8,d:2.4,phase:.4,period:2.4}); k.stack(2.9,0,130,2); k.pack(-2.9,0,139);
  k.floor(144,148); k.pitySnacks(0,0,145);
  const before=stage.entities.length, belt=k.belt(148,160,{x:0,z:4});
  stage.add(new ReversingFactoryBelt(stage,belt,stage.entities[before],k.W(-3.8,0,148)));
  k.trooper(-1.5,0,152); k.trooper(1.6,0,157); k.packs([[-3,154],[3,158]]);
  k.floor(160,168); k.mystery(2.8,0,163,{slot:0});
  const extraLife=k.oneUp(-3.6,0,167); extraLife.countable=false;
  k.dustWall(-3.6,0,165,{w:1.4,h:3.4,gatedBox:k.gatedArea(-4.3,-2.9,0,2,166,168)});
  k.tix(-2.2,0,103,-2.2,0,118,4); k.tix(0,0,125,0,0,143,5); k.tix(0,0,161,0,0,167,4);

  // Packaging Line uses the merged helper's side-control/camera contract.
  k.section(206,261,LABELS.packaging); k.camZone(206,261,'side',{side:-1,dist:11,height:2.2,ahead:0});
  // Cutaway banks keep the low side camera above foreground scenery. Track
  // collision uses the same authored left/right widths, independent of h.
  k.walls([[205,4.3,4.3,3.4],[206,4.3,4.3,.4],[207,1.6,1.6,.4],[260,1.6,1.6,.4],[261,4.3,4.3,.4],[262,4.3,4.3,3.4]]);
  k.floor(206,207,{w:3.2}); k.belt(207,226,{x:0,z:-2.5},{w:3.2});
  k.crusher(0,0,214,{w:3.2,d:2,period:2.4}); k.crusher(0,0,220,{w:3.2,d:2,period:2.4,phase:1.2});
  k.pack(0,0,217); k.pack(0,0,223); k.floor(226,230,{w:3.2}); k.snacks(0,0,228);
  k.dog(.8,0,229.5,'pug').dogId='3:pug-b'; k.belt(230,246,{x:0,z:-2},{w:3.2});
  k.mover(0,1.2,234,{axis:'z',range:4,speed:1.2,w:1.6,d:1.6});
  k.mover(0,2.4,240,{axis:'z',range:4,speed:1.2,w:1.6,d:1.6,phase:Math.PI});
  k.pack(0,3.6,240); k.crusher(0,0,243,{w:3.2,d:2,period:2});
  k.mover(0,0,250,{axis:'z',range:3.5,speed:1.5,w:2,d:2});
  k.floor(254,261,{w:3.2}); k.pitySnacks(0,0,255); k.stack(0,0,258,2);
  k.tix(0,.4,208,0,.4,225,5); k.tixArc(0,1.2,247,0,254,2,5);

  // Corrected candidate placements; owner review is required before activation.
  // Source 1.7 requires <=90m ordinary checkpoint spacing; 228→334 was106m.
  k.snacks(0,0,312);
  k.section(331,381,LABELS.vatOverflow); k.camZone(331,381,'rise',{height:5.5,dist:11});
  k.floor(331,337); k.snacks(-2.4,0,334);
  const valve=k.boneSwitch(1.8,0,336,[[0,9,378,3.2,3.2]]);
  const vat=k.rising(337,381,{y0:-1.2,y1:7.2,rate:.42,trigger:'switch'}).armWith(valve);
  const pattern=vatPattern(), worldPattern=worldVatPattern(track,pattern), problems=validatePattern(worldPattern);
  if (problems.length) throw new Error(`Unsafe L3 vat: ${JSON.stringify(problems)}`);
  stage.timedPatterns.push(worldPattern);
  const bounceFrom=stage.timedPatterns.length;
  k.bounceChain([[-1.8,340],[1.4,343]],{y:.8,tier:3});
  for(let i=bounceFrom;i<stage.timedPatterns.length;i++)stage.timedPatterns[i]=worldVatPattern(track,stage.timedPatterns[i]);
  for (const p of pattern.pieces) {
    if (p.kind==='blink') k.blinkBox(p.x,p.y,p.dd,{...p.params,tier:3});
    if (p.kind==='slide') k.slideBox(p.x,p.y,p.dd,{...p.params,tier:3});
    if (p.kind==='fall') k.fallBox(p.x,p.y,p.dd,{...p.params,tier:3});
    if (p.kind==='rest') k.platform(p.x,p.y,p.dd,2.6,2.6);
  }
  k.drone(0,5.6,355,{range:2.8,hover:1.4});
  const pity=k.pitySnacks(1.8,4.6,359), hit=pity.hit.bind(pity);
  pity.hit=()=>{ const before=pity.broken; hit(); if (!before && pity.broken) vat.onRespawn(); };
  const chainFrom=stage.timedPatterns.length;
  k.arrowChain(pattern.pieces.filter(p=>p.kind==='arrow').map(p=>[p.x,p.y,p.dd]),{power:16,tier:3});
  for(let i=chainFrom;i<stage.timedPatterns.length;i++)stage.timedPatterns[i]=worldVatPattern(track,stage.timedPatterns[i]);
  k.drone(0,8,370,{range:3,hover:1.2}); k.oneUp(0,9,378.5);
  k.pack(-1.2,9,377.5); k.pack(1.2,9,377.5);
  // Dedicated box placement rule 9: timing-pit guidance never pays Tickets.
  k.guideArc(-1.8,1.6,340,1.4,346,1.6,8); k.guideArc(-.4,4,349,1.8,359,1.2,10); k.guideArc(.6,6.2,362.5,.6,372,2.2,10);
  k.floor(379,380,{y:9,style:'platform',depth:.6}); k.floor(380,381,{y:[9,0],style:'platform',depth:.6});

  // The existing fan can bypass a disabled launcher: time trials omit
  // the raised detour geometry itself, leaving the original main route intact.
  if (!game.session.trial) addFactoryDetours(k,game,stage,track);
  k.colorPath('purple',[[-3.4,1.6,315.5,1.6,1.8],[-3.4,3.2,319,1.6,1.8],[-3,4.8,323,2.4,3.2]],{jackpot:15});
}

function addFactoryDetours(k,game,stage,track) {
  let roller, rugs;
  const ductFrom=stage.entities.length;
  const ducts=k.detour(188,201,{y:8,entry:'duct',x:3,build(kd) {
    kd.section(LABELS.maintenanceDucts); kd.floor(188,201,{x:0,w:2.6,depth:.8}); kd.start(0,.05,188);
    kd.pill(0,0,191,{range:1}); roller=kd.lint(0,0,189.5);
    rugs=[kd.rug(-.6,0,194),kd.rug(.6,0,196)]; kd.dog(0,0,198,'corgi').dogId='3:corgi-b';
    kd.fan(0,0,199,{height:4}); kd.platform(0,4,200,2,2);
    const vent=kd.smogVent(0,4,200,{lift:3,gatedBox:k.gatedArea(-1,1,12,17,199,201)});
    const hidden=placeHiddenBone(kd,game,stage,0,6.5,200,{move:'bark'});
    if(hidden){const collect=hidden.collect.bind(hidden);hidden.collect=()=>{if(vent.cleared&&game.player.abilities.bark)collect();};}
    kd.tix(0,0,189,0,0,197,4);
  }});
  ducts.factoryEntities=new Set(stage.entities.slice(ductFrom));
  scopeFactoryRoller(roller,rugs);
  // A visible low pipe roof marks the slide entrance without sealing the lane.
  k.platform(3,1,188,1.5,2,.2);
  stage.add(new FactoryDetourRecovery(stage,ducts,{entryX:3,exitD:200.7,backD:190.5}));

  k.arrowBox(-2.8,0,275,17);
  const railFrom=stage.entities.length;
  const rails=k.detour(276,312,{y:7,entry:'launch',x:-2.8,build(kd) {
    kd.section(LABELS.overheadRails); kd.platform(-2.8,0,279,3,3,.2);
    kd.zipline(-2.8,2.2,278,0,1.6,288,{speed:9});
    // Solid slabs leave the main floor/return walk intact at y+7.
    for (let d=289; d<298; d+=1.5) kd.platform(0,0,d+.75,2.4,1.58,.6);
    kd.dog(.6,0,294,'dalmatian').dogId='3:dalmatian-c'; kd.mystery(-.6,0,296,{slot:1});
    kd.tix(0,0,290,0,0,297,4); kd.platform(4,0,304,2,2);
    const prize=kd.pack(4,0,304,12); prize.countable=false;
    kd.zipline(0,2.4,298.5,0,-4.4,311,{speed:10});
  }});
  rails.factoryEntities=new Set(stage.entities.slice(railFrom));
  stage.add(new FactoryDetourRecovery(stage,rails,{entryX:-2.8,launch:true,exitD:310.7,backD:272.5}));
}

