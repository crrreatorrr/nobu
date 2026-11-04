// River lifecycle rules: path coordinates use inclusive starts and exclusive docks.
import { checkpointHelpAllowed } from './dda.js';
export const RAFT_CAMERA = Object.freeze({height:4.9,dist:9.6,ahead:7.5,fov:66});
export const FOOT_CAMERA = Object.freeze({height:4.3,dist:8.6,ahead:5.5,fov:60});
export const raftSpanAt = (spans,s) => spans?.find(r=>s>=r.d0&&s<r.d1) ?? null;
export const raftFallAt = (span,s) => span?.falls?.find(([a,b])=>s>=a&&s<b) ?? null;
export function boostAt(span,s) { return Math.max(1,...(span?.boost||[]).filter(([a,b])=>s>=a&&s<b).map(([, ,k])=>k)); }
export function raftHelp(session={}) {
 const allowed=checkpointHelpAllowed(session),deaths=session.deathsAtCp||0;
 return {speed:allowed&&deaths>=5?.92:1,force:allowed&&deaths>=5?.85:1,lily:allowed&&deaths>=7};
}
export function raftMountAllowed(player,span,s,waterY) {
 return !!span&&!raftFallAt(span,s)&&!player.dead&&!player.frozen&&!player.hang&&player.mode!=='victory'&&player.mode!=='dead'&&
  player.pos.y>=waterY-.3&&player.pos.y<=waterY+.6&&(player.body.grounded||player.vel.y<=0);
}
export function raftFeasibility(items,spans,{perturb=0}={}) {
 const failures=[];
 for(const span of spans){const row=items.filter(i=>i.d>=span.d0&&i.d<span.d1).sort((a,b)=>a.d-b.d);
  for(let i=1;i<row.length;i++){const a=row[i-1],b=row[i],speed=span.cfg.speed*Math.max(1,...span.boost.filter(([d0,d1])=>d0<b.d&&d1>a.d).map(([, ,m])=>m));
   const dx=Math.abs(b.x-a.x)+perturb+(b.opposingPush||0),minimum=Math.max(0,dx-1.67)/span.cfg.steer*speed+1;
   if(b.d-a.d+1e-8<minimum)failures.push({a:a.id,b:b.id,gap:b.d-a.d,minimum});
  }
 }
 return failures;
}
