import {GAUNTLET_FIRST_CLEAR_TICKETS} from '../config/tickets.js';
export {GAUNTLET_FIRST_CLEAR_TICKETS} from '../config/tickets.js';
export const GAUNTLET_COSMETICS={g1:{allBoxes:'crate-collar',flawless:'crate-bandana'},g2:{allBoxes:'steel-sheen',flawless:'blink-collar'},g3:{allBoxes:'laundry-trail',flawless:'rainbow-trail'}};
// Called at the ordinary level_end transaction, before its single save.write().
// Returns whole Tickets; callers must not feed this through raw-pickup conversion.
export function awardGauntlet(data,id,{broken,total,deaths,ms,godUsed=false,trial=false,remix=false}={}){
  if(!Object.hasOwn(GAUNTLET_COSMETICS,id)||data.godMode||godUsed||trial||remix)return{tickets:0,medals:[]};
  const row=(data.gauntlets||={})[id]||={},medals=[];
  const all=Number.isInteger(total)&&total>0&&broken===total;
  for(const[flag,earned]of[['clear',true],['allBoxes',all],['flawless',all&&deaths===0]])if(earned&&!row[flag]){row[flag]=true;medals.push(flag);}
  row.noDeath=!!row.flawless;
  if(Number.isInteger(ms)&&ms>=1000)row.bestMs=row.bestMs==null?ms:Math.min(row.bestMs,ms);
  const tickets=row.firstPaid?0:GAUNTLET_FIRST_CLEAR_TICKETS;row.firstPaid=true;
  return{tickets,medals,record:row};
}
export function gauntletCosmetics(data,{competitive=false,godMode=data.godMode}={}){
  if(competitive||godMode)return[];
  return Object.entries(GAUNTLET_COSMETICS).flatMap(([id,rewards])=>Object.entries(rewards).filter(([flag])=>data.gauntlets?.[id]?.[flag]).map(([,reward])=>reward));
}
