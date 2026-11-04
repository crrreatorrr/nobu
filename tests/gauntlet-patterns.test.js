import { describe, expect, it } from 'vitest';
import { validatePattern, blinkWindow } from '../src/levels/gauntletMath.js';
import { AUTHORED_PATTERNS, PROPOSED_PATTERNS, PROPOSED_TEACH_PATTERNS, placePattern } from '../src/levels/gauntletPatterns.js';
describe('reviewable pattern proposals using the same data as builders', () => {
  for(const p of [...PROPOSED_PATTERNS,...PROPOSED_TEACH_PATTERNS])it(`${p.id} meets its numeric tier`,()=>expect(validatePattern(p)).toEqual([]));
  it('does not silently replace the original unsafe literals',()=>{
    for(const id of ['P2','P3','P6','P7','P16'])expect(validatePattern(AUTHORED_PATTERNS.find(p=>p.id===id)).length,id).toBeGreaterThan(0);
  });
  it('rejects the raised final bounce 5m out at tier4.5',()=>{
    const p={tier:4.5,pieces:[{kind:'pack',dd:0},{kind:'pack',dd:5,y:.5}],route:[{from:0,to:1,move:'bounceHeld'}]};
    expect(validatePattern(p).some(p=>p.problem.startsWith('Reach'))).toBe(true);
  });
  it('rejects a 4.4m tap bounce at tier1',()=>{
    expect(validatePattern({tier:1,pieces:[{kind:'pack',dd:0},{kind:'pack',dd:4.4}],route:[{from:0,to:1,move:'bounceTap'}]}).length).toBeGreaterThan(0);
  });
  it('rejects a short blink input window without misstating it as zero',()=>{
    // The source calls this zero, but intersection of the authored intervals is .28s.
    expect(blinkWindow(.5,1,.5,.72)).toBeCloseTo(.28);
    const p={tier:1,pieces:[{kind:'blink',dd:0,params:{on:.5,off:1,phase:0}},{kind:'blink',dd:4,params:{on:.5,off:1,phase:-.5}}],route:[{from:0,to:1,move:'held'}]};
    expect(validatePattern(p).some(p=>p.problem.startsWith('Input window'))).toBe(true);
    expect(blinkWindow(.1,1,.5,.72)).toBe(0);
  });
  it('rejects side-by-side countable packs during auto-scroll',()=>{
    expect(validatePattern({tier:1,autoScroll:true,pieces:[{kind:'pack',dd:3,x:-1},{kind:'pack',dd:3,x:1}],route:[]}).some(p=>p.problem.includes('auto-scroll'))).toBe(true);
  });
  it('never treats temporary blink boxes as permanent rests',()=>{
    expect(validatePattern(AUTHORED_PATTERNS.find(p=>p.id==='P6')).some(p=>p.problem.includes('permanent rest'))).toBe(true);
  });
  it('rejects a launch route that assumes a power absent from its source box',()=>{
    expect(validatePattern({tier:1,pieces:[{kind:'lunch',dd:0},{kind:'lunch',dd:3}],route:[{from:0,to:1,move:'arrowHeld'}]}).some(p=>p.problem.includes('requires'))).toBe(true);
  });
  it('places every authored stack box and hazard from the tested data',()=>{
    const calls=[];const k=new Proxy({}, {get:(_,name)=>name==='boxPatterns'?[]:(...args)=>{calls.push([name,...args]);return name==='bounceChain'?args[0].map(()=>({name})): {name,args};}});
    const p=PROPOSED_PATTERNS.find(p=>p.id==='P4');placePattern(k,p,100,{gauntlet:true});
    expect(calls.filter(c=>c[0]==='pack').map(c=>c.slice(1))).toEqual([[0,0,103,0],[0,0,105.8,0],[0,1,105.8,0],[0,0,108.6,0],[0,1,108.6,0],[0,2,108.6,0]]);
    calls.length=0;placePattern(k,PROPOSED_PATTERNS.find(p=>p.id==='P2'),0,{gauntlet:false});
    expect(calls.find(c=>c[0]==='bounceChain')).toEqual(['bounceChain',[[0,0,3],[0,0,6.2],[0,0,9.4],[0,0,12.600000000000001]],{gauntlet:false}]);
  });
});
