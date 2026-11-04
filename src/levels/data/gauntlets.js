import { GAUNTLET_TEXT } from '../../story/script.js';
// H46 source recipes and tested corrections share the builder's exact placement data.
const piece=(kind,dd,y=0,params={},x=0)=>({kind,dd,y,x,params});
const hop=(from,to,move='held')=>({from,to,move});
function pattern(id,tier,start,end,items,moves=[],y0=0,y1=0){
  const pieces=[piece('floorEnd',start,y0),...items,piece('floorStart',end,y1)];
  return {id,tier,pieces,route:pieces.slice(1).map((_,i)=>hop(i,i+1,moves[i]||'held'))};
}
const fall=(d,y=0,delay=.45)=>piece('fall',d,y,{delay});
const blink=(d,y=0,phase=0,on=1.2,off=1)=>piece('blink',d,y,{phase,on,off});
const slide=(d,axis,range,speed,phase=0,y=0)=>piece('slide',d,y,{axis,range,speed,phase});
const arrow=(d,y=0,power=16)=>piece('arrow',d,y,{power});
const range=(a,b,fn)=>Array.from({length:b-a+1},(_,i)=>fn(a+i));
function fallRoute(p){p.route=p.route.map(s=>({...s,move:Math.abs(p.pieces[s.to].dd-p.pieces[s.from].dd)<=1 && p.pieces[s.to].y===p.pieces[s.from].y?'run':'held'}));p.route[0].move='held';return p;}
function recipes(){
  const g1=[
    pattern('g1-P2',1,20,36.5,[23,26.4,29.8,33.2].map(d=>piece('pack',d)),['held','bounceTap','bounceTap','bounceTap','bounceTap']),
    pattern('g1-P9',1.5,50,61,[slide(53.5,'x',1.2,1.2),slide(57.5,'x',1.2,1.2,Math.PI)]),
    fallRoute(pattern('g1-P7',1.5,70,86.5,[...range(71,79,d=>fall(d)),...range(83,85,d=>fall(d))])),
    pattern('g1-P10',1.5,96,113,[arrow(99),arrow(104),arrow(109)],['held','arrowTap','arrowTap','arrowTap'],0,2),
    pattern('g1-P5',1.5,130,147,[blink(133,0,0,1.6,.8),blink(136.5,1,-1,1.6,.8),blink(140,2,0,1.6,.8),blink(143.5,3,-1,1.6,.8)],[],0,4),
  ];
  const nitro=pattern('g2-P12',3.5,64,84,range(64,83,d=>piece('lunch',d,5)),[],5,5);
  nitro.route=[hop(0,1),hop(1,2,'run'),hop(2,3,'run'),hop(3,6),hop(6,10),hop(10,14),hop(14,18),hop(18,19,'run'),hop(19,20,'run'),hop(20,21)];
  nitro.pieces.push(...[67.5,71,75.5,79].map(d=>piece('rug',d,5.98)),piece('switch',90,5));
  nitro.clearAll={kind:'vacSwitch',piece:26,targets:[22,23,24,25]};
  const tnt=pattern('g2-P13',3.5,124,141,[blink(127),blink(130.5,0,-1),piece('floor',133),piece('floor',138)]);
  tnt.route=[hop(0,1),hop(1,2),hop(2,3),hop(3,2),hop(2,3),hop(4,5)];
  tnt.pieces.push(piece('cat',135),...[-.95,0,.95].flatMap(x=>[0,1].map(y=>piece('pack',136.6,y,{},x))));
  tnt.clearAll={kind:'explosion',piece:6,radius:2.7,targets:[7,8,9,10,11,12]};
  const g2=[
    fallRoute(pattern('g2-P7',3.5,8,28.5,[...range(9,16,d=>fall(d,0,.38)),...range(20,27,d=>fall(d,0,.38))])),
    pattern('g2-P11',3.5,36,53,[arrow(39),arrow(43.8,1.5),arrow(48.6,3)],['held','arrowTap','arrowTap','arrowTap'],0,5),
    nitro,pattern('g2-P8',3.5,100,114,[slide(103,'z',1.6,1.5),slide(109,'z',1.6,1.5,Math.PI)]),tnt,
    pattern('g2-P16',4,145,169.5,[blink(148,0,0,1,.8),fall(151.5,0,.32),arrow(154.5),slide(161,'z',1.2,1.5),piece('pack',165.5)],['held','held','held','arrowTap','held','bounceHeld'],0,2),
  ];
  const g3=[
    pattern('g3-P3',4.5,6,29.5,[piece('pack',9),piece('pack',12.4),piece('pack',17.6),piece('pack',21),piece('pack',26,.5)],['held','bounceTap','bounceHeld','bounceTap','bounceHeld','bounceTap']),
    pattern('g3-P6',5,36,57.6,range(1,8,i=>blink(36+2.4*i,0,-.6*(i-1),.9,.9))),
    pattern('g3-P14',4.5,66,80,[piece('lunch',69),piece('lunch',73,3),piece('lunch',77,6)],['held','double','double','held'],0,7),
    pattern('g3-P15',4.5,88,110,[piece('lunch',102),slide(106,'x',2,2.4)],['glide','held','held'],7,0),
    fallRoute(pattern('g3-P7',4.5,118,144.5,[...range(119,126,d=>fall(d,0,.30)),...range(130,135,d=>fall(d,0,.30)),...range(139,143,d=>fall(d,1,.30))],[],0,1)),
    pattern('g3-P16',5,150,175.5,[blink(153,1,0,.9,.8),fall(156.5,1,.30),arrow(159.5,1,18),slide(167,'z',1.6,2,0,1),piece('pack',171.5,1)],['held','held','held','arrowTap','held','bounceHeld'],1,3),
  ];
  return {g1,g2,g3};
}
export const GAUNTLET_SOURCE_PATTERNS=recipes();
export const GAUNTLET_PATTERNS=structuredClone(GAUNTLET_SOURCE_PATTERNS);
// Corrections are recorded in docs/expansion/h46-review.md; no validator exceptions.
const get=id=>Object.values(GAUNTLET_PATTERNS).flat().find(p=>p.id===id);
get('g1-P2').pieces.slice(1,5).forEach((p,i)=>p.dd=23+3.2*i);
for(const p of Object.values(GAUNTLET_PATTERNS).flat())for(const q of p.pieces)if(q.kind==='fall'){
  const tell={1.5:.55,3.5:.43,4:.4,4.5:.38,5:.35}[p.tier];q.params.delay=Math.max(q.params.delay,tell);
}
const stairs=get('g1-P5');stairs.pieces.push(piece('lunch',138.25,1.5));stairs.route=[hop(0,1),hop(1,2),hop(2,6),hop(6,3),hop(3,4),hop(4,5)];
get('g1-P2').route[4].move='bounceHeld';
const relay=get('g1-P10');relay.pieces.push(piece('lunch',101.5));relay.route=[hop(0,1),hop(1,5,'arrowTap'),hop(5,2),hop(2,3,'arrowTap'),hop(3,4,'arrowTap')];
get('g2-P16').route[3].move='arrowHeld';
get('g3-P3').pieces[5].dd=25.8;
get('g3-P16').pieces[5].y=2.8;
export const GAUNTLET_INFO={
  g1:{id:'g1',name:GAUNTLET_TEXT.names.g1,host:1,tier:1.5,theme:1,music:'level1',end:158,goal:154,count:12,moves:[[22,0,0],[24,14,0],[24,-14,0],[24,10,.6],[24,-10,0],[24,0,1.4],[24,0,0]]},
  g2:{id:'g2',name:GAUNTLET_TEXT.names.g2,host:3,tier:3.5,theme:3,music:'level3',end:180,goal:176,count:20,moves:[[22,0,0],[24,20,0],[24,-20,0],[26,0,0],[24,16,0],[24,-16,0],[26,0,0],[20,0,0]]},
  g3:{id:'g3',name:GAUNTLET_TEXT.names.g3,host:4,tier:4.5,theme:'house',music:'level4',end:186,goal:182,count:12,moves:[[22,0,0],[24,-16,0],[24,16,0],[24,0,1],[24,-18,0],[24,18,0],[26,0,1],[22,0,0]]},
};
export const POLAROID_SPOTS={g1:[1.4,4.5,175.4],g2:[-2.8,1,65.5],g3:[2.4,4.2,205]};
