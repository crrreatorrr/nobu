import {it,expect} from 'vitest';
import {L1_CHASE_RAW_ITEMS,L1_CHASE_CANDIDATE_ITEMS} from '../src/levels/data/l1-layout2.js';
import {l1CoconutTarget,l1Stops,l1ChaseProblems,simulateL1Coconut,l1StopBudget} from '../src/levels/l1ChaseMath.js';
it('honors absolute6.4m/s close speed,9m/s far cap and explicitDDA',()=>{
 expect(l1CoconutTarget(4)).toBeCloseTo(6.4);expect(l1CoconutTarget(100)).toBe(9);expect(l1CoconutTarget(100,.92)).toBeCloseTo(8.28);
});
it('rejects the written wide wall and its20m recovery without weakening the cumulative stop budget',()=>{
 expect(l1ChaseProblems(L1_CHASE_RAW_ITEMS).map(p=>p.problem)).toContain('Side-by-side countables in auto-scroll chase');
 expect(l1ChaseProblems(L1_CHASE_RAW_ITEMS).map(p=>p.problem)).toContain('Long stop lacks25m recovery');
 expect(l1ChaseProblems(L1_CHASE_CANDIDATE_ITEMS)).toEqual([]);
 const earlier=[];for(const stop of l1Stops(L1_CHASE_CANDIDATE_ITEMS)){
  const normal=l1StopBudget(earlier,stop.d);expect(normal).toBeGreaterThanOrEqual(1.3*stop.dur);expect(.75*normal).toBeGreaterThanOrEqual(stop.dur);
  expect(l1StopBudget(earlier,stop.d,.92)).toBeGreaterThanOrEqual(normal);earlier.push({d:stop.d-.8,dur:stop.dur});
 }
});
it('a full-speed run keeps at least8m lead, and the complete proposed Golden route survives its cumulative stops',()=>{
 expect(simulateL1Coconut().dead).toBe(false);expect(simulateL1Coconut().minGap).toBeGreaterThanOrEqual(8);
 const result=simulateL1Coconut({stops:l1Stops(L1_CHASE_CANDIDATE_ITEMS)});expect(result.dead).toBe(false);expect(result.minGap).toBeGreaterThanOrEqual(2);
});
