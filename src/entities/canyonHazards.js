import * as THREE from 'three';
import { chaseDda } from './chaser.js';
import { Entity } from './entity.js';
import { CoconutRoller } from './props.js';
import { audio } from '../audio/audio.js';
import { scratchPost } from '../world/decor.js';
import { COCONUT_CAP_PER_CLEAR, rawTicketsForWhole } from '../config/tickets.js';
import { TUNING } from '../config/movement.js';

// Same rise/tell/fall/rest cadence as Crusher, with a fixed >= .8 s shadow tell.
export class TopplingPost extends Entity {
  constructor(stage, x, y, z, { w, d = 1.6, period, phase = 0, yaw = 0 }) {
    super(stage,x,y,z); Object.assign(this,{w,d,period,phase,t:phase});
    this.obj.rotation.y = yaw;
    this.pivot = new THREE.Group(); this.pivot.position.x = -w/2; this.obj.add(this.pivot);
    // Existing scratch-post placeholder, rotated around its bottom edge.
    const proxy = { decor: (geometry,color,pos,rotation,scale) => { const m=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color}));m.position.copy(pos);if(rotation)m.rotation.set(rotation.x??0,rotation.y??0,rotation.z??0);if(typeof scale==='number')m.scale.setScalar(scale);else if(scale)m.scale.copy(scale);this.pivot.add(m); } };
    scratchPost(proxy,0,0,0,w);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color:0x271229,transparent:true,opacity:.15,depthWrite:false}));
    this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.035;this.obj.add(this.shadow);
    this.setBox(Math.abs(Math.cos(yaw))*w+Math.abs(Math.sin(yaw))*d,1.2,Math.abs(Math.sin(yaw))*w+Math.abs(Math.cos(yaw))*d);
  }
  update(dt) {
    dt*=chaseDda(this.session);
    this.t+=dt;
    const t=((this.t%this.period)+this.period)%this.period, warnStart=this.period*.5, fallStart=Math.max(warnStart+.8,this.period*.72), fallEnd=Math.min(this.period-.1,fallStart+.24);
    const q=t<warnStart?1-Math.min(1,t/(this.period*.35)):t<fallStart?0:t<fallEnd?(t-fallStart)/(fallEnd-fallStart):1;
    this.pivot.rotation.z=-Math.PI/2*q;
    this.dangerous=t>=fallStart&&t<=fallEnd;
    this.interactive=this.dangerous;
    this.shadow.material.opacity=t>=warnStart&&t<fallStart?.65:.15;
    if(this.dangerous&&!this.wasDangerous&&this.distToPlayer()<14){audio.play('stomp');this.game.camera.shake(.25,.2);}
    this.wasDangerous=this.dangerous;
  }
  onTouch(p){if(this.dangerous&&p.pos.y<this.pos.y+1.2)p.die('flat');}
  onStomp(p){this.onTouch(p);}
  onBite(){}
}

// Shares CoconutRoller's capped ticket category, but uses authored giant yarn volleys.
export class YarnAvalanche extends CoconutRoller {
  constructor(stage,track,d,opts) {
    super(stage,track,d,opts);this.skip=opts.skip;this.scale=opts.scale??2;this.radius=.45*this.scale;this.volley=0;
    this.geo=new THREE.SphereGeometry(this.radius,12,10);this.mat=new THREE.MeshLambertMaterial({color:0xc37cb2,wireframe:false});
    this.shadows=[];
    for(const lane of this.lanes){
      const vertices=[],indices=[];
      const count=Math.ceil(this.d-this.until);
      for(let i=0;i<=count;i++){
        const d=this.until+(this.d-this.until)*i/count;
        for(const x of [lane-.85,lane+.85])vertices.push(...track.toWorld(d,x,.04).toArray());
        if(i){const n=i*2;indices.push(n-2,n,n-1,n-1,n,n+1);}
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
      const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x201025,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));stage.scene.add(m);this.shadows.push({m,lane});
    }
    this.timer=1.5;
  }
  freeLane(){const seed=this.session?.runSeed??1;return ((Math.imul(seed|0,1664525)+Math.imul(this.volley+1,1013904223))>>>0)%this.lanes.length;}
  update(dt) {
    dt*=chaseDda(this.session);
    const p=this.player,ps=p.body.s??0,session=this.session,active=ps>this.until-6&&ps<this.d;
    this.timer-=dt;
    const free=this.skip==='shadow'?this.freeLane():-1;
    for(let i=0;i<this.shadows.length;i++){const {m,lane}=this.shadows[i];m.material.opacity=active&&this.timer<=1.5&&i===free?.55:0;}
    if(active&&this.timer<=0){
      this.timer=this.every;
      for(let i=0;i<this.lanes.length;i++){
        if((this.skip==='shadow'?i===free:i!==this.volley%this.lanes.length)||session.coconutSpawned>=rawTicketsForWhole(COCONUT_CAP_PER_CLEAR))continue;
        const m=new THREE.Mesh(this.geo,this.mat);m.castShadow=true;this.stage.scene.add(m);
        this.balls.push({id:++session.coconutSeq,m,s:this.d,u:this.lanes[i]});session.coconutSpawned++;
      }
      this.volley++;
    }
    for(let i=this.balls.length-1;i>=0;i--){
      const b=this.balls[i];b.s-=this.speed*dt;this.track.toWorld(b.s,b.u,0,b.m.position);b.m.position.y=this.track.heightAt(b.s)+this.radius;b.m.rotation.x-=this.speed*dt/this.radius;
      const distance=b.m.position.distanceTo(p.pos.clone().setY(p.pos.y+.5));let remove=b.s<this.until;
      if(!p.dead&&distance<this.radius+.45){
        if(p.biteT>=.1&&p.biteT<=.75){remove=true;audio.play('chompHit');if(!session.collectedCoconuts.has(b.id)){session.collectedCoconuts.add(b.id);this.game.tickets.spawnFlying(...b.m.position.toArray(),1,'coconut');}}
        else if(p.vel.y<0&&p.pos.y>b.m.position.y+.1){remove=true;p.bounce(TUNING.STOMP_BOUNCE);audio.play('squash');}
        else p.hurt('flat',b.m.position.x,b.m.position.z);
      }
      if(remove){this.stage.scene.remove(b.m);this.balls.splice(i,1);}
    }
  }
  reset(){super.reset();this.volley=0;for(const {m}of this.shadows)m.material.opacity=0;}
}
