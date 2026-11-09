// The Canopy's authored squirrel drops only when the final line reaches its exit.
import { audio } from '../audio/audio.js';
export function armCanopySquirrel(enemy,at){
 const behave=enemy.behave.bind(enemy),respawn=enemy.onRespawn?.bind(enemy);
 const state=enemy.canopyAmbush={mode:'armed',vy:0};
 const arm=()=>{state.mode='armed';state.vy=0;enemy.pos.copy(enemy.home);enemy.pos.y+=5;enemy.visible=false;enemy.interactive=false;enemy.obj.visible=false;enemy.obj.position.copy(enemy.pos);enemy.updateBox();};
 enemy.behave=dt=>{
  if(state.mode==='active'){behave(dt);return;}
  if(state.mode==='armed'){
   if((enemy.player.body.s??0)<at)return;
   state.mode='fall';enemy.visible=true;enemy.obj.visible=true;audio.play('whoosh');
  }
  state.vy-=25*dt;enemy.pos.y+=state.vy*dt;
  if(enemy.pos.y<=enemy.home.y){enemy.pos.y=enemy.home.y;state.mode='active';enemy.interactive=true;enemy.fx.dust(enemy.pos.x,enemy.pos.y,enemy.pos.z,{count:6,size:.2});}
 };
 enemy.onRespawn=()=>{respawn?.();arm();};arm();return enemy;
}
