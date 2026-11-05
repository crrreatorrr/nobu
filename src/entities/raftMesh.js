import * as THREE from 'three';
import { toon } from '../player/nobuPrims.js';
// Every resource here is procedural and owned by this root, never AssetStore.
export function raftBasketMesh() {
 const root=new THREE.Group(),blue=toon(0x5aa0e0),rim=toon(0x83c5f0),white=toon(0xeee8db);
 const box=(w,h,d,x,y,z,mat=blue)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);root.add(m);return m;};
 box(1.6,.09,1.4,0,.05,0);
 for(const x of [-.76,.76]){box(.08,.45,1.4,x,.3,0);box(.12,.07,1.48,x,.55,0,rim);}
 for(const z of [-.66,.66]){box(1.6,.45,.08,0,.3,z);box(1.6,.07,.12,0,.55,z,rim);}
 for(let x=-.6;x<=.61;x+=.3)for(const z of [-.71,.71])box(.05,.31,.02,x,.29,z,rim);
 for(const x of [-.5,.5]){const sock=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6),white);sock.scale.set(1,1.6,1);sock.position.set(x,.56,-.48);root.add(sock);}
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.geometry.userData.shared=true;}});
 return root;
}
export function disposeRaftMesh(root){
 if(!root||root.userData.raftDisposed)return;root.userData.raftDisposed=true;root.parent?.remove(root);
 const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});
 for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
}
