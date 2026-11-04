import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { World, moveBody } from '../src/world/physics.js';
vi.mock('../src/art/assets.js', () => ({ Assets: { tiled: () => null, has: () => false, tex: () => null } }));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));
import { Backpack } from '../src/entities/breakables.js';
import { Player } from '../src/player/player.js';
import { input } from '../src/core/input.js';
import { Stage } from '../src/world/stage.js';
import { Session } from '../src/game/session.js';
import { BlinkBox, FallBox, SlideBox, advanceBeatClocks } from '../src/entities/boxes.js';
import { PATTERNS, TEACH_PATTERNS, PROPOSED_PATTERNS } from '../src/levels/gauntletPatterns.js';
import { boxStripSections } from '../src/levels/boxDevStrip.js';
function fixture() {
  const player={pos:new THREE.Vector3(100,0,100),body:{hw:.3,hd:.3,h:1.3,grounded:false,ground:null},spawnAt(pos){this.pos.copy(pos);},facing:0};
  const g={player,session:{deathsAtCp:0},camera:{snap:vi.fn(),setMode:vi.fn()},mask:{snapTo:vi.fn()},fx:{clear:vi.fn()}};
  const s={game:g,world:new World(),theme:{},tier:1,entities:[]};
  return {g,s,player};
}
describe('canonical box integration',()=>{
  it('uses the approved exports in every dev-strip section, without a parallel placement copy',()=>{
    expect(PATTERNS).toBe(PROPOSED_PATTERNS);
    const normal=boxStripSections(),teach=boxStripSections(true);
    expect(normal).toHaveLength(16);expect(teach).toHaveLength(16);
    for(let i=0;i<16;i++){expect(normal[i].pattern).toBe(PATTERNS[i]);expect(teach[i].pattern).toBe(TEACH_PATTERNS[i]);}
  });
  it('advances a shared clock exactly once before updates while an offscreen sibling sleeps',()=>{
    const {s,player}=fixture();
    const a=new BlinkBox(s,0,0,0,{group:'pair'}),b=new BlinkBox(s,0,0,200,{group:'pair'});
    s.entities.push(a,b);Object.assign(s,{time:0,wind:{value:0},activeRange:10,sun:{position:new THREE.Vector3(),target:{position:new THREE.Vector3()}},_ambient(){},_emit(){}});
    player.pos.set(2,0,0);
    const observed=[];const update=a.update.bind(a);a.update=dt=>{observed.push(a.clock.t);update(dt);};
    const sleeping=vi.spyOn(b,'update');
    Stage.prototype.update.call(s,.25,player);
    expect(observed).toEqual([.25]);expect(sleeping).not.toHaveBeenCalled();expect(b.clock.t).toBe(.25);
    expect(a.clock).toBe(b.clock);
  });
  it('normal Session.respawn resets shared phase and slider position with no carry spike',()=>{
    const {s,g}=fixture(),a=new BlinkBox(s,0,0,0,{group:'cp'}),b=new BlinkBox(s,0,0,3,{group:'cp',phase:-1}),slider=new SlideBox(s,0,0,6,{phase:.3});
    s.entities=[a,b,slider];advanceBeatClocks(s,.7);a.update(0);b.update(0);slider.update();
    const session=Object.create(Session.prototype);g.session=session;
    Object.assign(session,{game:g,stage:s,deathsAtCp:0,lifeLine:0,phase:'level',cp:{pos:new THREE.Vector3(3,0,0),facing:0,seq:0,tickets:0,levelTickets:0},tickets:{restoreAfter:vi.fn(),clearFlying:vi.fn()},projectiles:{clear:vi.fn()},_undoLifeLinesAbove:vi.fn(),setMask:vi.fn(),_pushHud:vi.fn()});
    Session.prototype.respawn.call(session);
    expect(a.clock.t).toBe(0);expect(b.clock.t).toBe(0);expect(a.solid.enabled).toBe(true);expect(b.solid.enabled).toBe(false);
    expect(slider.clock.t).toBe(0);expect(slider.solid.delta).toEqual({x:0,y:0,z:0});expect(session.deathsAtCp).toBe(1);
    const phase=()=>{advanceBeatClocks(s,.4);a.update(0);b.update(0);return[a.solid.enabled,b.solid.enabled,a.clock.t];};
    const first=phase();Session.prototype.respawn.call(session);expect(phase()).toEqual(first);
  });
  it('breaks every approved bridge backpack in one forward crossing with real collision and bounce handlers',()=>{
    const {s,g,player}=fixture(),broken=[];let seq=0;
    g.fx={burst:vi.fn(),puff:vi.fn()};g.tickets={spawnFlying:vi.fn()};
    g.session={nextSeq:()=>++seq,onBreak:e=>broken.push(e)};
    const points=PATTERNS.find(p=>p.id==='P2').pieces.filter(p=>p.kind==='pack');
    const packs=points.map(p=>new Backpack(s,p.x,p.y,-p.dd,{tickets:0}));
    Object.assign(player,{mode:'normal',vel:new THREE.Vector3(0,-.6,0),bounce:Player.prototype.bounce});
    Object.assign(player.body,{pos:player.pos,vel:player.vel,onLand(solid,impact){solid.ref.onLand(player,impact);player.vel.z=-6;}});
    player.pos.set(0,1.01,-points[0].dd);
    const held=vi.spyOn(input,'held').mockReturnValue(false);
    for(let f=0;f<240 && broken.length<4;f++){
      player.vel.y=Math.max(-28,player.vel.y-36*(player.vel.y<0?1.4:1)/60);
      moveBody(s.world,player.body,1/60);
    }
    held.mockRestore();
    expect(broken).toEqual(packs);expect(packs.every(p=>p.broken && !p.solid.enabled)).toBe(true);
    expect(player.canDouble).toBe(true);expect(g.tickets.spawnFlying.mock.calls.every(args=>args[3]===0)).toBe(true);
  });
  it('a blink or fallen box waits through as many occupied return frames as necessary',()=>{
    const {s,player}=fixture(),blink=new BlinkBox(s,0,0,0,{on:1,off:1}),fall=new FallBox(s,3,0,0,{delay:.45});
    blink.clock.t=1.5;blink.update(0);player.pos.set(0,0,0);blink.clock.t=2.2;
    for(let f=0;f<30;f++)blink.update(1/60);
    expect(blink.solid.enabled).toBe(false);expect(blink.clock.t).toBe(2.2);
    player.pos.set(3,0,0);fall.reset();for(let f=0;f<30;f++)fall.update(1/60);expect(fall.solid.enabled).toBe(false);
    player.pos.set(6,0,0);blink.update(0);fall.update(0);expect(blink.solid.enabled).toBe(true);expect(fall.solid.enabled).toBe(true);
  });
});
