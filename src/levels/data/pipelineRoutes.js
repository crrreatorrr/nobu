import {L5_STEP} from './pipeline.js';
const piece=(kind,x,y,dd,params={})=>({kind,x,y,dd,params});
export function pipelineBidPattern({corrections=true}={}){
 return{id:'L5-BidWall',tier:5,autoScroll:false,pieces:[piece('floorEnd',0,0,236),piece('blink',-2,0,238.5,{on:L5_STEP,off:L5_STEP}),piece('pack',corrections?1.7:1.8,0,242.5),piece('pack',corrections?-1.1:-1.2,.6,246.5),piece('slide',1.4,0,250.5,{axis:'x',range:1.6,speed:1.7}),piece('floorStart',0,0,252)],route:['held','held','bounceHeld','bounceHeld','held'].map((move,i)=>({from:i,to:i+1,move}))};
}
export function pipelineLiquidationPatterns(){return[
 {id:'L5-LiquidationArrows',tier:5,pieces:[piece('floorEnd',0,0,402),piece('blink',0,.8,405,{on:L5_STEP,off:L5_STEP}),piece('arrow',0,1.2,409.5,{power:16}),piece('arrow',0,4.2,414,{power:16}),piece('floorStart',0,4.2,417)],route:['held','held','arrowHeld','arrowHeld'].map((move,i)=>({from:i,to:i+1,move}))},
 {id:'L5-LiquidationExit',tier:5,pieces:[piece('floorEnd',0,0,436),piece('fall',0,1.6,439.5,{delay:.35}),piece('pack',0,2,443),piece('floorStart',0,0,446)],route:[{from:0,to:1,move:'double'},{from:1,to:2,move:'held'},{from:2,to:3,move:'bounceHeld'}]},
];}
