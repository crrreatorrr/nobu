import {test,expect} from 'vitest';
import {canyonAudit,canyonStops,canyonSegments,simulateCanyon,canyonBudget}from'../src/levels/canyonChaseModel.js';
import {CORRECTED_CHASE_ITEMS,CORRECTED_DOGS,EXTENDED_CUTS,SB}from'../src/levels/data/l2-extended.js';
import {CHASE_TUNING}from'../src/config/chase.js';

test('literal source misses the cumulative 75% chase budget once actual wall geometry and cuts are included',()=>{
  expect(canyonAudit().map(o=>o.d)).toEqual([SB+22,SB+26,SB+42]);
});
test('corrected placement leaves every required stop inside 75% of its cumulative budget',()=>{
  expect(canyonAudit(CORRECTED_CHASE_ITEMS,CORRECTED_DOGS)).toEqual([]);
});
test('every >1 second maneuver leaves at least 25 metres before another required stop',()=>{
  const stops=canyonStops(CORRECTED_CHASE_ITEMS,CORRECTED_DOGS).filter(o=>o.dur>0);
  for(let i=0;i<stops.length-1;i++)if(stops[i].dur>1)expect(stops[i+1].d-stops[i].d).toBeGreaterThanOrEqual(25);
});
test('ordinary full running keeps at least eight metres of steady lead',()=>{
 const result=simulateCanyon({start:32,catStart:17,delay:1.8,until:190,cuts:[],blocked:[],hold:[]});expect(result.dead).toBe(false);expect(result.minGap).toBeGreaterThan(8);
 expect(CHASE_TUNING).toMatchObject({base:6.7,max:10.5,catchAt:2.4,nearSlope:.375,farSlope:.575});
});
test('faster corner arcs consume budget and DDA only improves it',()=>{
  const segment={start:20,catStart:8,delay:0,until:45,blocked:[],hold:[],cuts:[[10,15]]},at=25;
  const normal=canyonBudget(segment,[],at),withoutCuts=canyonBudget({...segment,cuts:[]},[],at),assisted=canyonBudget({...segment,mul:.92},[],at);
  expect(normal).toBeLessThan(withoutCuts);expect(assisted).toBeGreaterThan(normal);expect(EXTENDED_CUTS).toHaveLength(3);
});
test('overlong stops remain fatal, rather than being made safe by the rear catch exclusion',()=>{
 expect(simulateCanyon({start:SB+2,until:SB+33,stops:[{d:SB+12,dur:8}]}).dead).toBe(true);
});

test('the measured151 whole fits fixed183 while an authored184 fails without growing the cap',async()=>{
 const{LEVEL_TICKET_CAP}=await import('../src/config/tickets.js'),{LEVEL_BUDGETS}=await import('../src/levels/data/budgets.js'),{checkTicketBudget}=await import('../src/game/ticketBudget.js');
 expect(LEVEL_TICKET_CAP[2]).toBe(183);expect(checkTicketBudget(2,LEVEL_BUDGETS[2]).wholeMax).toBe(151);
 const extra={...LEVEL_BUDGETS[2],field:LEVEL_BUDGETS[2].field+99};expect(()=>checkTicketBudget(2,extra)).toThrow(/184 exceeds fixed cap 183/);expect(LEVEL_TICKET_CAP[2]).toBe(183);
});
