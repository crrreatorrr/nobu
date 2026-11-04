import * as THREE from 'three';
import {Assets} from '../art/assets.js';
import {GAUNTLET_INFO} from '../levels/data/gauntlets.js';
export function addGauntletPhotos(scene,data,resources){
 const wall=new THREE.Group();wall.name='gauntlet-photo-wall';wall.position.set(0,2.1,-3.9);
 for(const[id,info]of Object.entries(GAUNTLET_INFO)){
  const row=data.gauntlets?.[id];if(!row?.clear)continue;
  const frameMat=new THREE.MeshLambertMaterial({color:row.flawless||row.noDeath?0xffd23f:0xffffff});
  const photoMat=new THREE.MeshBasicMaterial({map:Assets.tex(`bg_level${info.host}`)});
  const frameGeo=new THREE.BoxGeometry(1.2,1.45,.08),photoGeo=new THREE.PlaneGeometry(.98,1.02);
  const frame=new THREE.Mesh(frameGeo,frameMat),photo=new THREE.Mesh(photoGeo,photoMat);
  frame.position.x=(Number(id[1])-2)*1.6;photo.position.set(frame.position.x,.1,.05);wall.add(frame,photo);
  for(const item of [frameMat,photoMat,frameGeo,photoGeo])resources.add(item);
 }
 scene.add(wall);return wall;
}
