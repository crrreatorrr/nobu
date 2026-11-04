import {Entity} from './entity.js';
import {audio} from '../audio/audio.js';
// A single cue per local blink group's on-beat, driven by the same respawn/DDA clock.
export class GauntletMetronome extends Entity {
 constructor(stage){super(stage,0,0,0);this.interactive=false;this.alwaysActive=true;this.countable=false;this.last=new Map();}
 update(){
  const groups=new Map();for(const item of this.stage.timedBoxes||[])if(item.kind==='blink'){
   const e=item.entity;if(!groups.has(e.clock))groups.set(e.clock,e);
  }
  for(const[clock,e]of groups){
   const cycle=e.on+e.off,t=clock.t+e.phase,beat=Math.floor(t/cycle),on=((t%cycle)+cycle)%cycle<e.on;
   if(e.distToPlayer()<18&&on&&this.last.get(clock)!==beat){this.last.set(clock,beat);audio.play('tick',1,{volume:.35});}
  }
 }
 onRespawn(){this.last.clear();}
}
