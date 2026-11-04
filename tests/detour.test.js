import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('../src/audio/audio.js', () => ({ audio:{play:vi.fn()} }));
vi.mock('../src/art/assets.js', () => ({ Assets:{model:()=>null,tiled:()=>new THREE.Texture(),tex:()=>new THREE.Texture(),has:()=>false,aspect:()=>1} }));
vi.mock('../src/entities/glowworm.js', () => ({ Glowworm:class { constructor(){this.light={};this.state='follow';}sleep(){this.state='sleep';}wake(){this.state='follow';} } }));
import { Track,turtle } from '../src/world/track.js';
import { World,moveBody } from '../src/world/physics.js';
import { GameCamera } from '../src/camera/camera.js';
import { CamZone,DarkZone,RisingHazard } from '../src/entities/environment.js';
import { installEnvironmentKit,validateDetours } from '../src/levels/environmentKit.js';
import { buildEnvironmentStrip } from '../src/levels/environmentStrip.js';
import { Chaser } from '../src/entities/chaser.js';
import { StaticPlatform } from '../src/entities/props.js';
function fixture() {
  const track=new Track(turtle([0,0,0],[[150,0,0]])); track.ground(-5,150);
  const player={pos:track.toWorld(10),body:{s:10,u:0},die:vi.fn()};
  const game={player,camera:new GameCamera(1),ui:{banner:vi.fn(),tutorial:vi.fn(),fade:vi.fn(()=>Promise.resolve())},session:{cp:{pos:player.pos.clone()}}};
  const stage={game,track,world:new World(),entities:[],scene:new THREE.Scene(),theme:{platform:'test'},defaultCamera:{mode:'track',track},sun:{intensity:1.5},hemi:{intensity:1.25},rim:{intensity:.45},add(e){this.entities.push(e);return e;}};
  stage.world.track=track; stage.scene.fog=new THREE.Fog(0xaaaaaa,45,120);
  const k={track,W:(x,y,d)=>track.toWorld(d,x,y),platform:(x,y,d,w,dd,h)=>stage.add(new StaticPlatform(stage,...track.toWorld(d,x,y).toArray(),{w,d:dd,h})),floor:(a,b,o)=>track.ground(a,b,{u:o.x,w:o.w,dy:o.y})};
  installEnvironmentKit(k,game,stage,null,track,()=>new THREE.MeshBasicMaterial());
  return {track,player,game,stage,k};
}
describe('environment controllers',()=>{
  it('frames side and rise tracks and restores camera zones on checkpoint reset',()=>{
    const {track,player,game,stage}=fixture(), cam=game.camera;
    cam.setMode('side',{track}); cam.snap(player); cam.update(0,player);
    expect(cam.sideAxis).toBe(true); expect(cam.basis.right.z).toBeCloseTo(-1); expect(cam.basis.forward.x).toBeCloseTo(-1);
    expect(cam.pos.x).toBeCloseTo(13);
    player.pos.y=12; cam.setMode('rise',{track}); cam.snap(player); expect(cam.trackY).toBe(11.5); expect(cam.look.y).toBeCloseTo(15.65);
    const zone=new CamZone(stage,track,20,30,'side'); player.body.s=22; zone.update();expect(cam.mode).toBe('side');
    game.session.cp.pos.copy(track.toWorld(5));zone.onRespawn();expect(cam.mode).toBe('track');
  });
  it('rises on enter, hurts only within its bounds, drains, and resets',()=>{
    const {track,stage,player}=fixture(), h=new RisingHazard(stage,track,20,30,{y0:-1,y1:4,rate:1});
    player.body.s=19;h.update(1);expect(h.state).toBe('armed');
    player.body.s=20;h.update(2);expect(h.y).toBe(1);expect(player.die).toHaveBeenCalledWith('fall');
    player.die.mockClear();player.body.s=31;h.update(.5);expect(h.state).toBe('draining');expect(player.die).not.toHaveBeenCalled();
    h.onRespawn();expect(h.y).toBe(-1);expect(h.state).toBe('armed');
    expect(h.fairness([{d:25,y:2,arrival:2}])).toHaveLength(1);
  });
  it('starts switch-triggered water after its linked switch and respects trial DDA',()=>{
    const {track,stage,player,game}=fixture(), sw={used:false},h=new RisingHazard(stage,track,20,30,{y0:-4,y1:4,rate:1,trigger:'switch'}).armWith(sw);
    player.body.s=22;h.update(1);expect(h.y).toBe(-4);sw.used=true; game.session.deathsAtCp=5;h.update(1);expect(h.y).toBeCloseTo(-3.08);
    h.onRespawn();game.session.trial=true;h.update(1);expect(h.y).toBe(-3);
  });
  it('blends all lights and fog over 1.2 seconds and restores Lumi from checkpoints',()=>{
    const {track,stage,player,game}=fixture(),zone=new DarkZone(stage,track,20,40);
    expect(zone.lumi.state).toBe('sleep');player.body.s=22;zone.update(.6);expect(zone.blend).toBeCloseTo(.5);expect(stage.sun.intensity).toBeCloseTo(.81);
    zone.update(.6);expect(stage.scene.fog.near).toBe(7);expect(zone.lumi.state).toBe('follow');
    player.body.s=50;zone.update(1.2);expect(stage.sun.intensity).toBe(1.5);expect(zone.lumi.state).toBe('sleep');
    game.session.cp.pos.copy(track.toWorld(25));zone.onRespawn();expect(zone.lumi.state).toBe('follow');
  });
});
describe('detour runtime and geometry',()=>{
  it('turns elevated floor requests into Solids without masking lower track spans',()=>{
    const {k,track,stage}=fixture(); const detour=k.detour(20,22,{y:10,build(kd){kd.floor(20,30,{w:3});kd.start(0,0,20);kd.exit(0,0,30);kd.returnLeg(25,30);}});
    expect(track.groundAt(25,0).y).toBe(0);expect(detour.solids.size).toBeGreaterThan(0);expect(stage.world.all.every(s=>s.max.y===10)).toBe(true);
    expect(validateDetours(stage)).toBe(true);
  });
  it('requires loops on chase and ride stretches, including boundaries',()=>{
    const {k,stage}=fixture(); k.chase(25,40,{model:'giant_coconut'});k.detour(20,30,{y:10,build(){}});expect(()=>validateDetours(stage)).toThrow(/loops/);
    stage.detours=[];k.detour(20,22,{y:10,build(){}});expect(validateDetours(stage)).toBe(true);
    stage.detours=[];stage.raftStretches=[{d0:50,d1:70}];k.detour(45,60,{y:10,build(){}});expect(()=>validateDetours(stage)).toThrow(/loops/);
  });
  it('rejects an unwalkable skipped span and accepts a permanent route',()=>{
    const {k,stage,track}=fixture();k.detour(20,30,{y:10,build(){}});expect(validateDetours(stage)).toBe(true);
    track.spans=[];expect(()=>validateDetours(stage)).toThrow(/walked back/);
  });
  it('rejects a covered burrow and a side lane without the required pit gap',()=>{
    const {k}=fixture();expect(()=>k.detour(20,22,{y:-5,build(kd){kd.floor(20,25,{x:0,w:3});}})).toThrow(/covered/);
    expect(()=>k.detour(20,22,{y:0,build(kd){kd.floor(20,25,{x:5,w:2});}})).toThrow(/1.8m/);
  });
  it('restores return-leg framing from a checkpoint and leaves falling to normal physics',()=>{
    const {k,game,track,stage}=fixture();const detour=k.detour(20,22,{y:10,build(kd){kd.floor(20,30,{w:3});kd.returnLeg(25,30);kd.platform(0,4,27,3,3);}});
    game.session.cp.pos.copy(track.toWorld(27,0,14));detour.onRespawn();expect(game.camera.mode).toBe('trackFront');
    game.session.cp.pos.copy(track.toWorld(23,0,10));detour.onRespawn();expect(game.camera.mode).toBe('track');
    const pos=track.toWorld(27,3,9),body={pos,vel:new THREE.Vector3(0,-8,0),w:.72,h:1.3,grounded:false,ground:null,s:27,u:3};
    for(let i=0;i<150;i++){body.vel.y-=36/120;moveBody(stage.world,body,1/120);}
    expect(pos.y).toBeCloseTo(0,2);expect(body.grounded).toBe(true);
  });
  it('offsets both zipline endpoints and records exits without replacing the authored return route',()=>{
    const {k,stage}=fixture();k.zipline=vi.fn();k.detour(20,22,{y:10,build(kd){kd.zipline(1,6,30,2,-8,22);kd.exit(2,-8,22);}});
    expect(k.zipline).toHaveBeenCalledWith(1,16,30,2,2,22,undefined);
    const detour=stage.detours[0];expect(detour.exitPos.y).toBe(2);
  });
  it('closes trial pipes and cancels pending entry travel on respawn',async()=>{
    const {k,game,player,track}=fixture(),detour=k.detour(20,22,{y:10,build(){}});
    player.pos.copy(track.toWorld(20));player.body.s=20;game.session.trial=true;const travel=vi.spyOn(detour,'travel');detour.update();expect(detour.lid.visible).toBe(true);expect(travel).not.toHaveBeenCalled();
    game.session.trial=false;let finish;game.ui.fade=vi.fn(()=>new Promise(r=>{finish=r;}));player.spawnAt=vi.fn();
    const pending=detour.travel(track.toWorld(20,0,10),20);detour.onRespawn();finish();await pending;expect(player.spawnAt).not.toHaveBeenCalled();
  });
  it('builds the acceptance strip through the real kit and keeps raised floors out of groundAt',()=>{
    const noop=()=>{},gradient={addColorStop:noop};
    const context=new Proxy({measureText:()=>({width:100}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>target[key]??noop});
    const canvas=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
    try {
      const {stage,game}=fixture();stage.setTrack=function(track){this.track=track;this.world.track=track;};
      const info=buildEnvironmentStrip(game,stage,{add:vi.fn()});
      expect(stage.entities.some(e=>e instanceof Chaser)).toBe(true);expect(stage.entities.some(e=>e instanceof RisingHazard)).toBe(true);expect(stage.entities.some(e=>e instanceof DarkZone)).toBe(true);
      expect(stage.detours).toHaveLength(1);const sky=stage.sections.find(s=>s.detour);expect(sky.name).toBe('Sky Loop');expect(sky.d0).toBe(80);expect(sky.d1).toBeGreaterThan(104);expect(stage.sections).toBe(stage.track.sections);expect(stage.track.groundAt(90,1.5).y).toBe(0);expect(info.camera.mode).toBe('track');expect(validateDetours(stage)).toBe(true);
    } finally {canvas.mockRestore();}
  });
  it('keeps canonical named sections searchable with inclusive starts and exclusive ends',()=>{
    const {track}=fixture();track.sections.push({d0:10,d1:20,name:'one'},{d0:20,d1:30,name:'two'});
    expect(track.sectionAt(10).name).toBe('one');expect(track.sectionAt(20).name).toBe('two');expect(track.sectionAt(30)).toBe(null);
  });
});
