// Authoring data is also the input to the unchanged H04d fairness validator.
const piece = (kind,x,y,dd,params) => ({kind,x,y,dd,params});
export function vatPattern(literal = false) {
  const pieces = [piece('floorStart',-1.8,0,337),piece('pack',-1.8,.8,340),piece('pack',1.4,.8,343),
    piece('blink',1.4,2.6,346,{on:1.2,off:1,phase:0,group:'vo-a'}),
    piece('blink',-.4,3.4,349,{on:1.2,off:1,phase:literal ? .6 : .65,group:'vo-a'}),
    piece('slide',-.4,4.2,literal?352.5:353.5,{axis:'x',range:1.6,speed:1.5})];
  if (!literal) pieces.push(piece('rest',1.8,4.6,356.5));
  pieces.push(piece('rest',1.8,4.6,359),piece('fall',.6,5.4,362.5,{delay:.45}),
    piece('fall',-.8,6,365.5,{delay:.45}),piece('arrow',-.8,literal?0:6.6,368.5,{power:16}),
    piece('arrow',.6,literal?0:7.4,372,{power:16}),piece('floorEnd',0,9,378));
  return {id:'l3-vat-overflow',tier:3,pieces,route:pieces.slice(1).map((_,i)=>({from:i,to:i+1,
    move:i===1||i===2?'bounceHeld':pieces[i].kind==='arrow'?'arrowHeld':'held'}))};
}

export function worldVatPattern(track, pattern=vatPattern()) {
  return {...pattern,pieces:pattern.pieces.map(p=>({...p,y:p.y+track.heightAt(p.dd)}))};
}
