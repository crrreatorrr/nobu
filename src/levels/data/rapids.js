// H45 source geometry. Literal positions remain available for negative audit cases.
export const L6_END=470,L6_GATE=452,L6_GOAL=455;
export const L6_TRACK=[[30,0,0],[30,12,-.4],[30,-16,-.4],[25,10,0],[25,-8,.6],[25,18,0],[30,-22,-.5],[25,26,0],[8,0,-3.2],[20,-10,0],[25,14,0],[25,-12,0],[30,16,-.6],[6,0,-3.5],[24,-18,0],[6,0,-3.5],[20,12,0],[25,-6,.4],[20,20,-1],[8,0,-2.6],[25,-14,0],[20,0,0]];
export const L6_RAFT_SPANS_LITERAL=[
 {d0:26,d1:108,cfg:{speed:10.5,steer:6},boost:[],falls:[]},
 {d0:160,d1:246,cfg:{speed:11,steer:6},boost:[[220,228,1.3]],falls:[]},
 {d0:304,d1:382,cfg:{speed:11.5,steer:6},boost:[],falls:[[329,333],[359,363]]},
 {d0:426,d1:455,cfg:{speed:12,steer:6},boost:[[429,437,1.3]],falls:[]},
];
export const L6_RAFT_SPANS=L6_RAFT_SPANS_LITERAL.map(span=>({...span,cfg:{...span.cfg},boost:span.boost.map(r=>[...r]),falls:(span.d0===304?[[329.75,333.75],[360.75,364.75]]:span.falls).map(r=>[...r])}));
export const L6_RAFT_ITEMS_LITERAL=[
 ['pack-a',-2.4,44],['pack-b',2.4,51],['pack-c',0,66],['dog-pug',3.2,82],['sphere-a',-2.6,91],['cp-a',0,95],['pack-d',-2.4,103,1],['pack-e',0,106.5],
 ['pack-f',2.6,182],['pack-g',2.6,184.5],['dog-corgi',2.8,200],['cp-b',0,204],['pack-h',-3,236],['pack-i',2.8,245],
 ['cp-c',0,338],['pack-j',0,346],['pack-k',-2.8,371],['sphere-b',0,376],['pack-l',2.8,380],
].map(([id,x,d,opposingPush=0])=>({id,x,d,opposingPush}));
const corrected={'pack-b':51.5,'sphere-a':91.4,'pack-h':235.5,'pack-l':380.5};
export const L6_RAFT_ITEMS=L6_RAFT_ITEMS_LITERAL.map(item=>({...item,d:corrected[item.id]??item.d}));
