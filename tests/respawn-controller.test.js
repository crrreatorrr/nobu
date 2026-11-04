import * as THREE from 'three';
import {test,expect,vi} from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{tiled:()=>null,has:()=>false,tex:()=>null}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn()}}));
import {Session} from '../src/game/session.js';
function fixture(withRaft){
 const order=[],pos=new THREE.Vector3(),cpPos=new THREE.Vector3(3,2,1);
 const g={player:{pos,spawnAt(at){order.push('spawn');pos.copy(at);this.ride=null;}},fx:{clear(){}},camera:{snap(p){order.push('camera');expect(p.pos.x).toBe(withRaft?4:3);}},mask:{snapTo(){}},ui:{}};
 const session=new Session(g,1);session.stage={entities:[]};session.cp={pos:cpPos,seq:0,tickets:0,levelTickets:0,freedIds:new Set()};
 Object.assign(session,{snack:{raw:0},tickets:{restoreAfter(){},clearFlying(){}},projectiles:{clear(){}},_undoLifeLinesAbove(){},setMask(){},_pushHud(){order.push('hud');}});
 if(withRaft)session.stage.raftController={restoreAtCheckpoint(at){order.push('raft');expect(g.player.pos.equals(at)).toBe(true);g.player.pos.x+=1;g.player.ride={speedK:.35};}};
 return{session,g,cpPos,order};
}
test('raft checkpoint hook runs after spawn, before camera, and leaves immutable checkpoint unchanged',()=>{
 const{session,g,cpPos,order}=fixture(true),snapshot=cpPos.clone();session.respawn();
 expect(order).toEqual(['spawn','raft','camera','hud']);expect(cpPos.equals(snapshot)).toBe(true);expect(g.player.ride.speedK).toBe(.35);
});
test('ordinary checkpoint respawn keeps its previous order and position without a raft controller',()=>{
 const{session,g,cpPos,order}=fixture(false);session.respawn();expect(order).toEqual(['spawn','camera','hud']);expect(g.player.pos.equals(cpPos)).toBe(true);expect(g.player.ride).toBe(null);
});
