import { L2_CHASE_BREAKABLES, L2_CHASE } from './l2-chase.js';
export const SPLICES_2 = [[169.5, 74], [230, 90], [267, 55]];
export const extendedD = d => d + 30 + SPLICES_2.reduce((n, [at, extra]) => n + (d >= at ? extra : 0), 0);
export const SB = 199.5, CF = 259.5, SF = 334, YA = 461;
export const EXTENDED_MOVES = [[50,0,0],[30,18,0],[30,-22,-1],[30,14,0],[30,-18,.8],[30,22,0], [20,24,1.5],[20,-30,1.5],[20,18,0],[14,-12,0], [30,-14,-.8],[30,10,0], [30,16,0],[30,-26,0],[30,10,0], [30,-18,0],[7,0,0], [27.5,8,1.2],[27.5,-8,1.3], [23,0,0],[24,0,0]];
const item = (kind, x, d, rest = {}) => ({ kind, x, y: 0, d, ...rest });
const wall = (d, gap) => [-3.6,-1.8,0,1.8,3.6].filter(x=>x!==gap).map(x=>item('pack',x,d));
export const EXTENDED_CHASE_ITEMS = [
  ...L2_CHASE_BREAKABLES.map(o=>({...o,d:extendedD(o.d)})),
  item('snacks',0,extendedD(116)), item('snacks',-2.6,extendedD(117.5),{resetChase:true}),
  item('snacks',0,SB+2), ...wall(SB+22,1.8), item('rug',1.8,SB+22),
  item('snacks',-2.6,SB+33), ...wall(SB+42,-1.8), item('rug',-1.8,SB+42),item('cat',-2.8,SB+50),
  item('snacks',0,CF+4), item('mystery',-1.8,CF+8,{slot:'l2-fort'}),
  item('pack',-3.4,SF+20),item('pack',3.4,SF+22),item('snacks',-2.8,SF+30),
  item('snacks',0,SF+51),item('snacks',-2.6,SF+53,{resetChase:true}),
  item('stack',2.6,SF+58,{height:2}),item('pack',0,SF+75),item('pack',-3.4,SF+85),item('pack',3.4,SF+87.5),
  item('snacks',0,YA-1),item('pack',2.6,YA+12),item('pack',0,YA+30),item('pack',-2.6,YA+33),item('pack',2.6,YA+46),
];
export const EXTENDED_DOGS = [
  {id:'2:corgi-a',breed:'corgi',x:-3.6,d:extendedD(60.5)}, {id:'2:pug-a',breed:'pug',x:3.6,d:extendedD(146)},
  {id:'2:shiba-a',breed:'shiba',x:-3.6,d:extendedD(258.5)},
  {id:'2:corgi-b',breed:'corgi',x:-3.6,d:SB+26}, {id:'2:shiba-b',breed:'shiba',x:.4,y:8,d:extendedD(132),detour:'flap'},
  {id:'2:dalmatian-a',breed:'dalmatian',x:3.6,d:SF+34}, {id:'2:pug-b',breed:'pug',x:-7.8,y:-5,d:SF+62,detour:'river'},
];
export const EXTENDED_CUTS = [[SB+8,SB+13],[SB+28,SB+34],[SB+48,SB+53]];
export const EXTENDED_CHASE = {start:32,catStart:17,initialDelay:1.8,respawnDelay:1.6,gate:551,cuts:EXTENDED_CUTS, hold:[[CF+1,CF+13,CF-1]],blocked:L2_CHASE.blocked.map(([a,b])=>[extendedD(a),extendedD(a)+(b-a)]).concat([[YA+48,YA+54]])};

// Review-only safety option. Never activated by the shipped registry.
export const CORRECTED_CHASE_ITEMS = EXTENDED_CHASE_ITEMS.map(o => ({...o,d:o.d===SB+22?SB+12:o.d===SB+42?SB+37:o.kind==='cat'&&o.d===SB+50?SB+.5:o.d})).concat(item('snacks',0,extendedD(241)));
export const CORRECTED_DOGS = EXTENDED_DOGS.map(o=>({...o,d:o.id==='2:corgi-b'?SB+1:o.id==='2:shiba-a'?extendedD(239.5):o.d}));
export const EXTENDED_DETOUR_ITEMS = [
  item('cat',-.8,extendedD(123),{y:8,detour:'flap'}),item('cat',.8,extendedD(129),{y:8,detour:'flap'}),
  item('pack',.6,extendedD(140),{y:8,detour:'flap'}),item('pack',1.8,extendedD(140),{y:8,detour:'flap'}),
  item('mystery',-7.2,SF+66,{y:-5,detour:'river',slot:1}),
];
export const CANYON_BOUNCE_ITEM = item('pack',0,YA+55,{tickets:1,bounce:true});
