// Owner approved the tested corrections on 2026-11-04. Original literals remain regression fixtures.
const p = (kind, dd, y = 0, params = {}) => ({ kind, dd, x: 0, y, params, countable: ['pack','rug','cat','switch','stack'].includes(kind) });
const step = (from,to,move='held') => ({from,to,move});
function line(id,tier,pieces,moves=[],floor='pit') {
  return {id,tier,floor,pieces,route:pieces.slice(1).map((_,i)=>step(i,i+1,moves[i]||'held'))};
}
const blink = (d,y,phase=0,on=1.4,off=1) => p('blink',d,y,{phase,on,off});
const slide = (d,axis='z',range=1.6,speed=1.5,phase=0) => p('slide',d,0,{axis,range,speed,phase});
function build(proposed=false) {
  const rows=[];
  rows.push(line('P1',1,[p('floorEnd',0),p('lunch',2.5),p('lunch',6,1),p('lunch',9.5,2),p('floorStart',12,3)]));
  rows.at(-1).pieces.push(p('lunch',6),p('lunch',9.5),p('lunch',9.5,1));
  const spacing=proposed?3.2:3.4;
  rows.push(line('P2',1,[p('floorEnd',0),...[0,1,2,3].map(i=>p('pack',3+i*spacing)),p('floorStart',3+3*spacing+3.3)],['held','bounceTap','bounceTap','bounceTap','bounceTap']));
  const long=proposed?4.8:5.2;
  rows.push(line('P3',3,[p('floorEnd',0),p('pack',3),p('pack',6.4),p('pack',6.4+long),p('pack',9.8+long),p('pack',9.8+2*long),p('floorStart',13.1+2*long)],['held','bounceTap','bounceHeld','bounceTap','bounceHeld','bounceTap']));
  rows.push(line('P4',2,[p('floorEnd',0),p('stack',3),{...p('stack',5.8),height:2},{...p('stack',8.6),height:3},p('floorStart',11,3)],['held','bounceHeld','bounceHeld','bounceHeld'],'floor'));
  rows.push(line('P5',2,[p('floorEnd',0),blink(3,0),blink(6.5,1,-1),blink(10,2),blink(13.5,3,-1),p('floorStart',16,4)]));
  if(proposed){
    const pattern=rows.at(-1);pattern.pieces.push(p('lunch',8.25,1.5));
    pattern.route=[step(0,1),step(1,2),step(2,6),step(6,3),step(3,4),step(4,5)];
  }
  rows.push(line('P6',3,[p('floorEnd',0),...Array.from({length:8},(_,i)=>proposed && i===3?p('lunch',2.4*(i+1)):blink(2.4*(i+1),0,-.8*i,1.2,1.2)),p('floorStart',22.6)],Array(9).fill('held')));
  const falling=[...Array.from({length:8},(_,i)=>p('fall',i+1,0,{delay:proposed?.50:.45})),...Array.from({length:6},(_,i)=>p('fall',i+12,0,{delay:proposed?.50:.45})),...Array.from({length:5},(_,i)=>p('fall',i+21,1,{delay:proposed?.50:.45}))];
  const floorRun=line('P7',2,[p('floorEnd',0),...falling,p('floorStart',26.5,1)]);
  floorRun.route=floorRun.route.map(s=>({...s,move:Math.abs(floorRun.pieces[s.to].dd-floorRun.pieces[s.from].dd)<=1 && floorRun.pieces[s.to].y===floorRun.pieces[s.from].y?'run':'held'}));
  // Entry is an actual jump onto a one metre box, not a step.
  floorRun.route[0].move='held';rows.push(floorRun);
  rows.push(line('P8',3,[p('floorEnd',0),slide(3),slide(9,'z',1.6,1.5,Math.PI),p('floorStart',14)]));
  rows.push(line('P9',1,[p('floorEnd',0),slide(3.5,'x',1.2,1.2),slide(7.5,'x',1.2,1.2,Math.PI),p('floorStart',11)]));
  rows.push(line('P10',2,[p('floorEnd',0),p('arrow',3,0,{power:16}),p('arrow',8,0,{power:16}),p('arrow',13,0,{power:16}),p('floorStart',17,2)],['held','arrowTap','arrowTap','arrowTap']));
  rows.push(line('P11',3,[p('floorEnd',0),p('arrow',3,0,{power:16}),p('arrow',7.8,1.5,{power:16}),p('arrow',12.6,3,{power:16}),p('floorStart',16.6,5)],['held','arrowTap','arrowTap','arrowTap']));
  const nitro=line('P12',3,[p('floorEnd',0,.98),...Array.from({length:20},(_,i)=>p('lunch',i)),p('floorStart',21,.98)],Array(21).fill('run'));
  nitro.route[0].move='held';nitro.route.at(-1).move='held';
  nitro.pieces.push(...[3.5,7,11.5,15].map(d=>p('rug',d,.98)),p('switch',23));
  nitro.clearAll={kind:'vacSwitch',piece:nitro.pieces.length-1,targets:[22,23,24,25]};rows.push(nitro);
  const escape=line('P13',3,[p('floorEnd',0),blink(3,0,0,1.2,1),blink(6.5,0,-1,1.2,1),p('floor',9),p('floor',14),p('floorStart',17)]);
  escape.route=[step(0,1),step(1,2),step(2,3),step(3,2),step(2,3),step(4,5)];
  escape.pieces.push(p('cat',11),...[-.95,0,.95].flatMap(x=>[0,1].map(y=>({...p('pack',12.6,y),x}))));
  escape.clearAll={kind:'explosion',piece:6,radius:2.7,targets:[7,8,9,10,11,12]};rows.push(escape);
  rows.push(line('P14',3,[p('floorEnd',0),p('lunch',3),p('lunch',7,3),p('lunch',11,6),p('floorStart',14,7)],['held','double','double','held']));
  rows.push(line('P15',4,[p('floorEnd',0,6),p('lunch',14),slide(18,'x',2,2.4),p('floorStart',22)],['glide','held','held']));
  rows.at(-1).requiresMove='glide';
  rows.push(line('P16',4,[p('floorEnd',0),blink(3,0,0,1,.8),p('fall',6.5,0,{delay:proposed?.40:.32}),p('arrow',9.5,0,{power:16}),slide(16,'z',1.2,1.5),p('pack',20.5),p('floorStart',24.5,2)],['held','held','held',proposed?'arrowHeld':'arrowTap','held','bounceHeld']));
  return rows;
}
export const AUTHORED_PATTERNS=build(false);
export const PROPOSED_PATTERNS=build(true);
// Canonical runtime exports use the owner-approved, validated placements.
export const PATTERNS=PROPOSED_PATTERNS;

export const PROPOSED_TEACH_PATTERNS=PROPOSED_PATTERNS.map(original=>{
  const t=structuredClone(original);t.id+='-teach';t.tier=1;t.floor='floor';
  for(const piece of t.pieces) {
    if(piece.kind==='blink')Object.assign(piece.params,{on:1.6,off:.8});
    if(piece.kind==='fall')piece.params.delay=.6;
    if(piece.kind==='slide')Object.assign(piece.params,{range:1.2,speed:1.2});
  }
  if(original.id==='P1')t.pieces[4].y=0;
  if(original.id==='P2')t.pieces.forEach((p,i)=>{if(i>0&&i<5)p.dd=3*i;if(i===5)p.dd=15.3;});
  if(original.id==='P3') {
    const ds=[0,3,6.4,10.5,13.9,18,21.3];t.pieces.forEach((p,i)=>p.dd=ds[i]);
    for(const s of t.route)if(s.move.startsWith('bounce'))s.move='bounceHeld';
  }
  if(original.id==='P5'){t.pieces.pop();t.pieces[2].kind='lunch';t.route=t.pieces.slice(1).map((_,i)=>step(i,i+1));}
  if(original.id==='P6'){t.pieces[4].kind='blink';for(let i=1;i<=8;i++)t.pieces[i].params.phase=-(i-1);for(const i of [3,6])t.pieces[i].kind='lunch';}
  if(original.id==='P7'){
    t.pieces=t.pieces.filter(p=>p.kind!=='fall'||p.dd<=17);
    for(const p of t.pieces)p.y=0;t.pieces.at(-1).dd=18.5;
    t.route=t.pieces.slice(1).map((_,i)=>step(i,i+1,i>0&&t.pieces[i+1].dd-t.pieces[i].dd<=1?'run':'held'));
  }
  if(original.id==='P10')for(let i=2;i<=4;i++)t.pieces[i].dd-=.2*(i-1);
  if(original.id==='P11')for(let i=2;i<=4;i++)t.pieces[i].dd-=.6*(i-1);
  if(original.id==='P10'||original.id==='P11'){
    t.pieces.splice(3,1);
    t.pieces.at(-1).dd=original.id==='P10'?12:11.2;
    if(original.id==='P11')t.pieces.at(-1).y=3.5;
    t.route=[step(0,1),step(1,2,'arrowTap'),step(2,3,'arrowTap')];
  }
  if(original.id==='P14'){t.pieces[2].y=2.5;t.pieces[3].y=5;t.pieces[4].y=6;}
  if(original.id==='P16'){t.pieces[2].kind='lunch';t.pieces.at(-1).dd=24.1;}
  return t;
});

export const TEACH_PATTERNS=PROPOSED_TEACH_PATTERNS;

// Builders and the validator consume the same placements, including countable pieces.
export function placePattern(k, pattern, d0=0, { gauntlet=false }={}) {
  const placed=[];
  const entry=pattern.pieces.find(p=>p.kind==='floorEnd'),exit=pattern.pieces.find(p=>p.kind==='floorStart');
  k.boxPatterns?.push({...pattern,d0});
  if(pattern.floor==='floor')k.floor(d0+entry.dd,d0+exit.dd,{y:0});
  k.floor(d0-5,d0+entry.dd,{y:entry.y});k.floor(d0+exit.dd,d0+exit.dd+5,{y:exit.y});
  const bounceIndices=new Set(pattern.route.filter(s=>s.move.startsWith('bounce') && pattern.pieces[s.from].kind==='pack').map(s=>s.from));
  if(bounceIndices.size){
    const points=[...bounceIndices].map(i=>{const p=pattern.pieces[i];return[p.x||0,p.y||0,d0+p.dd];});
    placed.push(...k.bounceChain(points,{gauntlet}));
  }
  for(let i=0;i<pattern.pieces.length;i++) {
    if(bounceIndices.has(i))continue;
    const p=pattern.pieces[i],d=d0+p.dd,x=p.x||0,y=p.y||0;
    const opts=p.params||{};let e;
    switch(p.kind) {
      case 'lunch':e=k.lunch(x,y,d);break;
      case 'pack':e=k.pack(x,y,d,gauntlet?0:1);break;
      case 'stack':for(let n=0;n<(p.height||1);n++)placed.push(k.pack(x,y+n,d,gauntlet?0:1));break;
      case 'blink':e=k.blinkBox(x,y,d,{...opts,tier:pattern.tier,group:`${pattern.id}:${d0}`});break;
      case 'fall':e=k.fallBox(x,y,d,{...opts,tier:pattern.tier});break;
      case 'slide':e=k.slideBox(x,y,d,opts);break;
      case 'arrow':e=k.arrowBox(x,y,d,opts.power||16);break;
      case 'rug':e=k.rug(x,y,d);break;
      case 'cat':e=k.cat(x,y,d);break;
      case 'switch':e=k.vacSwitch(x,y,d);break;
      case 'floor': {
        const next=pattern.pieces.slice(i+1).find(p=>p.kind==='floor');
        if(next)k.floor(d,next.dd+d0,{y,w:3});break;
      }
    }
    if(e)placed.push(e);
  }
  return placed;
}

// Owner additionally approved this permanent rest on 2026-11-04: ‘Add the permanent rest’.
export const P5_ACTION_REST_PROPOSAL=PATTERNS.find(p=>p.id==='P5');
