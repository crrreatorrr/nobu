// Route audits use built box positions and track heights, rather than a second layout.
export function laundryBoilerPattern(stage){
 const data=[...stage.timedBoxes.filter(p=>p.d>=410&&p.d<=448),...stage.entities.filter(e=>e.laundryRest).map(e=>({kind:'lunch',...e.laundryRest,params:{}}))].sort((a,b)=>a.d-b.d);
 const pieces=[{kind:'floorStart',x:0,y:stage.track.heightAt(408),d:408},...data.map(p=>({kind:p.kind==='bounce'?'pack':p.kind,x:p.x,y:p.y+stage.track.heightAt(p.d),d:p.d,params:{...p.params}}))];
 const route=pieces.slice(1).map((p,i)=>({from:i,to:i+1,move:pieces[i].kind==='arrow'?'arrowHeld':pieces[i].kind==='pack'?'bounceHeld':'held'}));
 return {id:'laundry-boiler',pieces,route,tier:4};
}
export function laundryCerealPattern(stage){
 const data=stage.timedBoxes.filter(p=>p.d>=348&&p.d<=362).sort((a,b)=>a.d-b.d);
 const pieces=[{kind:'floorStart',x:0,y:stage.track.heightAt(345.5),d:345.5},...data.map(p=>({kind:p.kind,x:p.x,y:p.y+stage.track.heightAt(p.d),d:p.d,params:{...p.params}})),stage.cerealLane?{kind:'rest',x:0,y:stage.cerealLane.exitTop,d:stage.cerealLane.exit}:{kind:'floorEnd',x:0,y:stage.track.heightAt(366),d:366}];
 return {id:'laundry-cereal',tier:4,pieces,route:pieces.slice(1).map((_,i)=>({from:i,to:i+1,move:stage.cerealLane?'double':'held'}))};
}
