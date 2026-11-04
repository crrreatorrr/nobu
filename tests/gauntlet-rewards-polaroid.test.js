import * as THREE from 'three';
import {test,expect,vi,beforeEach} from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{tex:()=>new THREE.Texture()}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn()}}));
import {save,SAVE_KEY} from '../src/core/save.js';
import {Polaroid} from '../src/entities/polaroid.js';
import {awardGauntlet,gauntletCosmetics} from '../src/game/gauntletRewards.js';
import {masteryPoints} from '../src/game/progress.js';
beforeEach(()=>{localStorage.clear();localStorage.setItem(SAVE_KEY,JSON.stringify({v:3}));save.load();});
function photo(){const g={session:{deaths:0},player:{pos:new THREE.Vector3()},ui:{banner:vi.fn(),tutorial:vi.fn()}};const s={game:g};return{g,p:new Polaroid(s,0,0,0,{id:'g1'})};}
test('Polaroid greys after any death including after a checkpoint, and a fresh attempt restores availability',()=>{
 const{g,p}=photo();g.session.deaths=1;p.update(0);expect(p.available).toBe(false);expect(p.frameMaterial.opacity).toBe(.35);expect(p.onTouch()).toBe(false);
 g.session.deathsAtCp=0;p.update(0);expect(p.available).toBe(false);
 g.session={deaths:0};p.update(0);expect(p.onTouch()).toBe(true);expect(save.data.gauntlets.g1.found).toBe(true);
 save.load();expect(save.data.gauntlets.g1.found).toBe(true);expect(photo().p.visible).toBe(false);
});
for(const mode of ['trial','remix','bossRush','medalRun','boardRun','godUsed'])test(`Polaroid never unlocks in ${mode}`,()=>{
 const{g,p}=photo();g.session[mode]=true;p.update(0);expect(p.visible).toBe(false);expect(p.onTouch()).toBe(false);expect(save.data.gauntlets).toEqual({});
});
test('God mode hides Polaroid without a death',()=>{save.data.godMode=true;expect(photo().p.onTouch()).toBe(false);});
test('clear reward pays exactly five whole Tickets once across reload and New Game; no-death alone is not Flawless',()=>{
 const a=awardGauntlet(save.data,'g1',{broken:11,total:12,deaths:0,ms:22000});expect(a).toMatchObject({tickets:5,medals:['clear']});
 expect(save.data.gauntlets.g1.flawless).toBeUndefined();save.write();save.load();
 expect(awardGauntlet(save.data,'g1',{broken:12,total:12,deaths:1,ms:21000})).toMatchObject({tickets:0,medals:['allBoxes']});
 expect(awardGauntlet(save.data,'g1',{broken:12,total:12,deaths:0,ms:23000})).toMatchObject({tickets:0,medals:['flawless']});
 expect(save.data.gauntlets.g1.bestMs).toBe(21000);save.write();save.reset();
 expect(awardGauntlet(save.data,'g1',{broken:12,total:12,deaths:0,ms:20000}).tickets).toBe(0);
});
test('three gauntlets add exactly nine mastery points and grant only earned procedural cosmetics',()=>{
 for(const id of ['g1','g2','g3'])awardGauntlet(save.data,id,{broken:12,total:12,deaths:0,ms:10000});
 const registry=Object.fromEntries(['g1','g2','g3'].map(id=>[id,{id,shipped:true,gauntlet:true,bonus:true}]));
 expect(masteryPoints(save.data,registry)).toBe(9);expect(gauntletCosmetics(save.data)).toHaveLength(6);expect(gauntletCosmetics(save.data,{competitive:true})).toEqual([]);
});
test('invalid time cannot poison local best and God-used/trial/remix cannot award medals or Tickets',()=>{
 for(const context of [{godUsed:true},{trial:true},{remix:true}])expect(awardGauntlet(save.data,'g1',{broken:12,total:12,deaths:0,ms:10000,...context}).tickets).toBe(0);
 expect(save.data.gauntlets).toEqual({});awardGauntlet(save.data,'g1',{broken:12,total:12,deaths:0,ms:Infinity});expect(save.data.gauntlets.g1.bestMs).toBeUndefined();
});

const {basePointsMax}=await import('../src/game/progress.js');
const {updateGauntletLook,clearGauntletLook}=await import('../src/player/gauntletLook.js');
const {addGauntletPhotos}=await import('../src/game/gauntletPhotos.js');
test('gauntlets add mastery without inflating story, dog or Bone Board denominator',()=>{
 const reg={1:{id:1,shipped:true,dogs:{a:'start'}},g1:{id:'g1',shipped:true,bonus:true,gauntlet:true,dogs:{}}};
 expect(basePointsMax(reg)).toBe(basePointsMax({1:reg[1]}));
});
test('procedural rewards cleanly restore shared model materials in competitive play and disposal',()=>{
 const root=new THREE.Group(),socket=new THREE.Group(),original=new THREE.MeshLambertMaterial({color:0xab8159}),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),original);root.add(mesh,socket);
 const p={root:new THREE.Group(),model:{root,neckSocket:socket},vel:new THREE.Vector3(2,0,0),facing:0};
 const data={gauntlets:{g1:{allBoxes:true,flawless:true},g2:{allBoxes:true,flawless:true},g3:{allBoxes:true,flawless:true}}};
 updateGauntletLook(p,data,{},.1);expect(p.gauntletLook.trails).toHaveLength(8);expect(p.gauntletLook.blink).toBeTruthy();expect(mesh.material).not.toBe(original);
 const decorated=p.gauntletLook.groups;updateGauntletLook(p,data,{trial:true},.1);expect(mesh.material).toBe(original);expect(decorated.every(g=>!g.parent)).toBe(true);expect(p.gauntletLook.trails).toEqual([]);
 clearGauntletLook(p);expect(p.gauntletLook).toBe(null);expect(socket.children).toHaveLength(0);
});
test('Kennel photo wall shows earned Clears only, gold only for Flawless, with independently disposed resources',()=>{
 const s=new THREE.Scene(),resources=new Set(),wall=addGauntletPhotos(s,{gauntlets:{g1:{clear:true},g2:{clear:true,flawless:true},g3:{found:true}}},resources);
 expect(wall.children).toHaveLength(4);expect(wall.children[0].material.color.getHex()).toBe(0xffffff);expect(wall.children[2].material.color.getHex()).toBe(0xffd23f);expect(resources.size).toBe(8);
});
