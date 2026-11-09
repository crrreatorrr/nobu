import {PumpStone} from '../entities/pumpStone.js';
export function installPipelineKit(k,game,stage){
 k.pumpStone=(x,y,d,o)=>stage.add(new PumpStone(stage,...k.W(x,y,d).toArray(),o));
 return k;
}
