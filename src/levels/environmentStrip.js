// Dev-only acceptance strip: T.environment(), then T.at(18/80/120/155/184).
import { makeKit, makeTrack, turtle } from './kit.js';
export function buildEnvironmentStrip(game, stage, tickets) {
  const track = makeTrack(stage,turtle([0,0,0],[[240,0,0]]));
  const k = makeKit(game,stage,tickets,track);
  k.section(0,240,'Environment Strip');
  k.floor(-8,184); k.floor(184,189,{y:-3}); k.floor(214,240);
  k.walls([[-8,4.3,4.3,2.6],[150,4.3,4.3,2.6],[155,4.3,4.3,1.1],[175,4.3,4.3,1.1],[180,4.3,4.3,2.6],[240,4.3,4.3,2.6]]);
  k.backstop(-8);k.backstop(240);
  k.snacks(3,0,16); k.chase(20,60,{model:'giant_coconut',scale:1,speed:6.7}); k.log(38); k.snacks(3,0,64);
  k.detour(80,82,{y:10,entry:'pipe',build(kd){
    kd.section('Sky Loop');
    kd.start(1.5,.1,80); kd.floor(80,103,{x:1.5,w:2.2});kd.pack(1.5,0,91);
    kd.platform(0,1.5,104,5,3);kd.returnLeg(80,105);
    kd.floor(80,104,{x:-2.5,w:2.2,y:3});kd.snacks(-2.5,3,98);
    kd.exit(-2.5,-10,82);kd.zipline(-2.5,4.5,83,-2.5,-8.6,80);
  }});
  k.dark(120,145,{radius:4});k.snacks(3,0,148);
  k.camZone(155,175,'side');k.packs([[0,160],[0,166]]);k.snacks(3,0,181);
  k.rising(184,214,{y0:-5,y1:6,rate:.4});k.camZone(184,214,'rise');
  for (const [d,y] of [[188,-1],[191,1],[195,3],[199,5],[203,7],[208,7]]) k.platform(0,y,d,3,3);
  k.snacks(0,7,203);
  return {spawn:k.W(0,0,1),facing:track.yaw(1),camera:{mode:'track',track,height:4.3,dist:8.6,ahead:5.5}};
}
