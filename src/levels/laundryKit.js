// Local installer lets H40 author/test its helpers without editing the shared kit.
import { Iron, SteamFan, DustBunny, armAmbush, cookieJar } from '../entities/laundry.js';
import { TreatTray } from '../entities/secrets.js';
import { installBoneHelpers } from '../entities/hiddenBone.js';
export function installLaundryHelpers(k,game,stage,track=k.track){
  installBoneHelpers(k,game,stage);
  const fan=k.fan,oranges=k.coconuts,round=k.bonusRound;
  k.iron=(d0,d1,o)=>stage.add(new Iron(stage,track,d0,d1,o));
  k.fan=(x,y,d,o={})=>o.steam?stage.add(new SteamFan(stage,...k.W(x,y,d).toArray(),o)):fan(x,y,d,o);
  k.coconuts=(d,o={})=>{const roller=oranges(d,o);if(o.color!==undefined){roller.mat.color.setHex(o.color);roller.color=o.color;}return roller;};
  k.dustBunny=(x,y,d,o={})=>stage.add(new DustBunny(stage,...k.W(x,y,d).toArray(),{...o,dirV:o.axis==='z'?k.fwdAt(d):k.rightAt(d)}));
  for(const name of ['broc','spiky','trooper','squirrel','drone','vacuum','mouse','yarn','pill','knight','shellback','dustBunny']){
    const build=k[name];k[name]=(x,y,d,o={})=>{const actor=build(x,y,d,o);return o.ambush?armAmbush(actor,track,o.ambush):actor;};
  }
  k.bonusRound=options=>{
    const before=stage.entities.length,tray=round(options);
    if(options.skin==='jar')for(const entity of stage.entities.slice(before))if(entity instanceof TreatTray)cookieJar(entity);
    return tray;
  };
  return k;
}
