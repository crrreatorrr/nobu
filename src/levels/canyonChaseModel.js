import { chaseSpeed } from '../config/chase.js';
import { wallManeuver } from '../../tools/audit/chaseModel.js';
import { EXTENDED_CHASE_ITEMS, EXTENDED_CHASE, EXTENDED_DOGS, CANYON_BOUNCE_ITEM } from './data/l2-extended.js';
export const canyonStops = (items=EXTENDED_CHASE_ITEMS,dogs=EXTENDED_DOGS) => {
  const groups=new Map();for(const item of items){if(['snacks','rug'].includes(item.kind))continue;if(!groups.has(item.d))groups.set(item.d,[]);groups.get(item.d).push(item);}
  const stops=[...groups].map(([d,g])=>({d,dur:g.length>1?wallManeuver(g.map(o=>o.x)).dur:g[0].kind==='stack'?.76:g[0].kind==='sphere'?0:g[0].kind==='cat'?.2:Math.abs(g[0].x)>1?.3:.1,kind:g[0].kind}));
  for(const dog of dogs.filter(o=>!o.detour))stops.push({d:dog.d,dur:.4,kind:'dog'});
  stops.push({d:CANYON_BOUNCE_ITEM.d,dur:0,kind:'bounce'});
  return stops.sort((a,b)=>a.d-b.d);
};
export function simulateCanyon({start,catStart=start-13,delay=1.6,until,stops=[],cuts=EXTENDED_CHASE.cuts,blocked=EXTENDED_CHASE.blocked,hold=EXTENDED_CHASE.hold,mul=1,dt=1/240}){
  let ps=start,cs=catStart,speed=2.5,wait=delay,leapEnd=0,corner=false,held=false,minGap=Infinity;const used=new Set(),left=stops.map(o=>({...o,left:o.dur}));
  for(let n=0;ps<until&&n<240*300;n++){
    const stop=left.find(o=>ps>=o.d-.8&&o.left>0);if(stop)stop.left-=dt;else ps+=8*dt;
    const fort=hold.find(([a,b])=>ps>=a&&ps<b);if(fort){held=true;continue;}if(held){const h=hold.find(([,b])=>ps>=b);if(h){cs=h[2];speed=2.5;wait=1;held=false;}}
    if(wait>0){wait-=dt;continue;}
    const gap=ps-cs,target=chaseSpeed(gap,6.7,1,mul);if(cs>=leapEnd)speed+=(target-speed)*(1-Math.exp(-2*dt));cs+=speed*dt;
    if(corner)cs=Math.min(cs,leapEnd);
    if(corner&&cs<leapEnd)cs+=Math.max(0,Math.min(8*dt,leapEnd-cs,ps-3.5-cs));
    if(cs>=leapEnd)corner=false;
    for(let i=0;i<cuts.length;i++){const[a,b]=cuts[i];if(!used.has(i)&&cs>=a){used.add(i);if(cs<=b&&ps-b>=3.5){leapEnd=b;corner=true;speed=Math.max(speed,7.5);}}}
    if(cs>=leapEnd&&blocked.some(([a,b])=>cs+2.8>=a&&cs+2.8<=b)){const end=blocked.find(([a,b])=>cs+2.8>=a&&cs+2.8<=b)[1];leapEnd=end+1.4;speed=Math.max(speed,7.5);}
    minGap=Math.min(minGap,ps-cs);if(ps-cs<2.4&&ps-cs>-1)return{dead:true,minGap,at:ps};
  }
  return{dead:false,minGap,at:ps};
}
export function canyonBudget(segment,earlier,d){let lo=0,hi=6;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(simulateCanyon({...segment,stops:[...earlier,{d,dur:mid}]}).dead)hi=mid;else lo=mid;}return lo;}
export function canyonSegments(items=EXTENDED_CHASE_ITEMS){const cps=items.filter(o=>o.kind==='snacks').map(o=>o.d).sort((a,b)=>a-b);return[EXTENDED_CHASE.start,...cps].map((start,i)=>({start,catStart:i?start-13:EXTENDED_CHASE.catStart,delay:i?1.6:1.8,until:cps[i]??551}));}
export function canyonAudit(items=EXTENDED_CHASE_ITEMS,dogs=EXTENDED_DOGS,options={}){const failures=[],stops=canyonStops(items,dogs);for(const base of canyonSegments(items)){const segment={...base,...options};const earlier=[];for(const stop of stops.filter(o=>o.d>segment.start&&o.d<segment.until)){const available=canyonBudget(segment,earlier,stop.d);if(stop.dur>available*.75)failures.push({...stop,available,start:segment.start});earlier.push(stop);}}return failures;}
