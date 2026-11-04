import * as THREE from 'three';
import { makeKit } from './kit.js';
import { buildTitanArena } from '../bosses/titanArena.js';

export function buildBoss4Arena(game,stage,tickets){
  const k=makeKit(game,stage,tickets);
  stage.block(-13,-6,-13,13,0,13,'ground');
  const pieces=buildTitanArena(stage);
  stage.block(-8,0,-18,8,4,-15,'wall',{solid:false});
  for(const x of [-17,17])for(const z of [-17,17])stage.block(x-.8,0,z-.8,x+.8,12,z+.8,'wall',{solid:false});
  const socket=new THREE.Mesh(new THREE.BoxGeometry(.8,.9,.15),new THREE.MeshLambertMaterial({color:0xf0e4d0}));socket.position.set(0,.6,-12.8);stage.scene.add(socket);
  const lamp=new THREE.PointLight(0xffd6a0,8,20);lamp.position.set(16,6,-9);stage.scene.add(lamp);
  k.sphere(-9,0,-9);k.tix(-6,0,-9,6,0,-9,7);
  return {...pieces,spawn:new THREE.Vector3(0,0,9),facing:Math.PI,camera:{mode:'arena',center:new THREE.Vector3(),offset:{x:0,y:12.5,z:16.5},follow:.45},spheres:[new THREE.Vector3(-9,0,9),new THREE.Vector3(9,0,9),new THREE.Vector3(0,0,10)]};
}
