// H40 authored track-space data. Builders and feasibility checks share these values.
export const L4_END = 486;
export const L4_GATE = 476;
export const L4_TRIGGER = 478;
export const L4_TRACK = [[24,0,0],[26,-30,0],[24,0,0],[26,40,0],[25,0,0],[28,0,.6],[27,-20,0],[24,30,1.4],[22,0,0],[24,-25,0],[28,-35,0],[26,20,0],[26,0,0],[24,-20,-4],[24,15,-3],[22,0,-2],[24,25,0],[24,-30,0],[22,0,0],[22,0,0]];
export const L4_WALLS = [[-8,4.3,4.3,2.8],[52,4.3,4.3,2.8],[56,6.2,6.2,3.4],[120,6.2,6.2,3.4],[124,4.3,4.3,2.8],[184,4.3,4.3,2.8],[188,4.3,10.2,2.8],[244,4.3,10.2,2.8],[248,4.6,4.6,2.8],[330,4.6,4.6,2.8],[334,3.6,3.6,3.2],[378,3.6,3.6,3.2],[380,7.2,6.1,3.2],[392,7.2,6.1,3.2],[396,4.3,4.3,3.6],[470,4.3,4.3,3.6],[488,4.3,4.3,3.6]];
export const L4_SECTIONS = [[-8,50,'hallway'],[50,125,'laundry'],[125,180,'ironing'],[180,250,'kitchen'],[250,330,'stampede'],[330,400,'basement'],[400,486,'boiler']];
export const L4_DRUMS = [{d:64,y:3.2,r:3.2,n:4,period:8},{d:79,y:3.2,r:3.4,n:4,period:6.5,crumble:[2]}];
export const L4_CHECKPOINTS = [48.5,181,248,333,403];
export const L4_PITY = [[0,3.2,72.6],[0,0,113.5],[-2.4,0,179],[-2.4,0,218],[-3.4,0,288],[0,0,345.5],[2.4,0,374],[0,0,407.5]];
export const L4_DOGS = [
 {id:'corgi-a',breed:'corgi',x:3.2,y:0,d:35,section:'hallway'},
 {id:'pug-a',breed:'pug',x:-3.6,y:6.6,d:67,section:'laundry'},
 {id:'dalmatian-a',breed:'dalmatian',x:2.4,y:4.2,d:205.6,section:'kitchen'},
 {id:'shiba-a',breed:'shiba',x:2.8,y:0,d:366.5,section:'basement'},
 {id:'corgi-b',breed:'corgi',x:5.4,y:0,d:387.5,section:'basement'},
 {id:'dalmatian-b',breed:'dalmatian',x:2.6,y:1.8,d:148,section:'topShelf',detour:true},
 {id:'shiba-b',breed:'shiba',x:2.6,y:4.6,d:415.5,section:'boiler'},
];
export const L4_MYSTERIES = [{x:-3,y:2,d:32.4,slot:0},{x:-3.2,y:4.2,d:193.4,slot:1},{x:8,y:0,d:198,slot:2}];
export const L4_STAMPEDE = { start:254,catStart:241,initialDelay:1.2,delay:1.2,respawnDelay:1.6,gate:328,until:328,model:'model_mini_roomba',scale:1.4,count:3,speed:7.2,catchUp:1,lanes:[-2.2,0,2.2],blocked:[[268,271.5],[306,309.5],[262,262.6],[290,290.6],[318,318.6]],pits:[[268,271.5],[306,309.5]] };
export const L4_CHASE_PACKS = [{kind:'pack',x:0,y:0,d:275},{kind:'pack',x:2.6,y:0,d:292},{kind:'pack',x:-2.6,y:0,d:300}];
export const L4_DETOURS = [{id:'topShelf',entry:120,exit:120,y:9.5,loop:true,skipSpan:null},{id:'pantry',entry:187,exit:244,y:0,loop:false,skipSpan:[187,244]}];
export const L4_RISING = {d0:408,d1:457,y0:-3,y1:8,rate:.6};
export const L4_RISING_CHECKS = [[410.5,.98,1.5],[415,5.18,3.5],[419.5,8.98,5.5],[423,9.38,7],[426.5,9.38,9],[430,9.78,11],[432.8,9.6,12],[435.6,11.4,14],[438.2,11.98,15],[441,13.58,16],[444.4,13.58,17],[447.8,13.58,18]];
export const L4_HIDDEN = {x:-6.2,y:0,d:386,section:'basement',move:'dust'};

// Historical recipe is retained only for regression comparisons. The owner approved407.5.
export const L4_PITY_LITERAL=L4_PITY.map(p=>p[2]===407.5?[p[0],p[1],409]:[...p]);
