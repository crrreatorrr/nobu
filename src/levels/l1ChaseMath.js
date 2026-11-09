import { chaseSpeed } from '../config/chase.js';
import { wallManeuver } from '../../tools/audit/chaseModel.js';
import { L1_COCONUT } from './data/l1-layout2.js';
export { L1_COCONUT } from './data/l1-layout2.js';
export const l1CoconutTarget = (gap,mul=1)=>Math.min(L1_COCONUT.max,chaseSpeed(gap,L1_COCONUT.base,1,1))*mul;
export function l1Stops(items){
 const groups=new Map();for(const item of items){if(!groups.has(item.d))groups.set(item.d,[]);groups.get(item.d).push(item);}
 return [...groups].sort(([a],[b])=>a-b).map(([d,group])=>({d,dur:group.length>1?wallManeuver(group.map(p=>p.x)).dur:group[0].kind==='stack'?group[0].height*.34+(group[0].height-1)*.08:Math.abs(group[0].x)>1?.3:.1}));
}
export function simulateL1Coconut({stops=[],mul=1,start=L1_COCONUT.start,checkpoint=L1_COCONUT.checkpoint,until=L1_COCONUT.end}={}){
 let ps=start,cs=checkpoint-13,v=2.5,wait=1.6,minGap=Infinity,leap=0,pitWait=0;const pending=stops.map(p=>({...p,left:p.dur})),dt=1/240;
 for(let frame=0;frame<60*240 && ps<until;frame++){
  const stop=pending.find(p=>ps>=p.d &&p.left>0);if(stop)stop.left-=dt;else ps+=8*dt;
  if(wait>0){wait-=dt;continue;}
  if(pitWait>0){pitWait-=dt;if(pitWait<=0)cs=Math.min(ps-L1_COCONUT.catchAt,Math.max(L1_COCONUT.pit[1]+1.4,ps-13));continue;}
  const target=l1CoconutTarget(ps-cs,mul);if(leap>0)leap-=v*dt;else v+=(target-v)*(1-Math.exp(-2*dt));
  if(!leap &&cs+2.8>=L1_COCONUT.log[0] &&cs+2.8<=L1_COCONUT.log[1]){v=Math.max(v,7.5);leap=4;}
  if(!leap &&cs+2.8>=L1_COCONUT.pit[0] &&cs+2.8<=L1_COCONUT.pit[1]){pitWait=.6;continue;}
  cs+=v*dt;minGap=Math.min(minGap,ps-cs);if(ps-cs<2)return{dead:true,minGap,at:ps};
 }
 return{dead:false,minGap,at:ps};
}
export function l1StopBudget(earlier,d,mul=1){let lo=0,hi=6;for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(simulateL1Coconut({stops:[...earlier,{d:d-.8,dur:mid}],mul}).dead)hi=mid;else lo=mid;}return lo;}
export function l1ChaseProblems(items){
 const problems=[],groups=new Map();for(const item of items){if(!groups.has(item.d))groups.set(item.d,[]);groups.get(item.d).push(item);}
 for(const [d,group]of groups)if(group.length>1 && new Set(group.map(p=>p.x)).size>1)problems.push({d,problem:'Side-by-side countables in auto-scroll chase'});
 const stops=l1Stops(items),earlier=[];for(let i=0;i<stops.length;i++){
  const stop=stops[i],budget=l1StopBudget(earlier,stop.d);
  if(budget<1.3*stop.dur)problems.push({d:stop.d,problem:'Stop need exceeds 1/1.3 budget',budget,need:stop.dur});
  if(stop.dur>.75*budget)problems.push({d:stop.d,problem:'Stop exceeds75% remaining budget',budget,need:stop.dur});
  if(stop.dur>1 && i+1<stops.length &&stops[i+1].d-stop.d<25)problems.push({d:stop.d,problem:'Long stop lacks25m recovery'});
  earlier.push({d:stop.d-.8,dur:stop.dur});
 }
 return problems;
}
