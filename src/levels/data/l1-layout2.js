// Inactive candidate layout. Root activates it with trial migration, metadata and owner-approved cap.
export const L1_START = [0,0,10];
export const L1_SPLICES = [[249,75],[287,55],[308,95]];
export const shiftL1 = d => d + L1_SPLICES.reduce((n,[at,length])=>n+(d>=at?length:0),0);
export const L1_MOVES_CLASSIC = [[20,0,0],[24,32,0],[22,-8,.8],[26,-52,0],[20,8,-1.2],[25,42,0],[20,0,0],[25,-28,1.5],[22,22,0],[25,35,3.2],[20,-18,-.5],[25,-34,.4],[30,26,0],[24,0,0]];
export const L1_MOVES_EXTENDED = [...L1_MOVES_CLASSIC.slice(0,11),[25,14,1],[25,-8,.6],[25,-6,-1.6],[25,-34,.4],[12.5,10.83,0],[27.5,-8,-2],[27.5,8,-1.5],[17.5,15.17,0],[3.5,0,0],[20,10,1.2],[25,-16,.6],[25,18,0],[25,-12,-1.8],[20.5,0,0]];
export const L1_LAYOUT2 = {version:2,end:547,gate:539,gateVisual:538,targets:[94,120,158,86],hubFloorMs:25700};
export const L1_ADDED_DOGS = {'pug-b':'canopy','dalmatian-b':'burrow','corgi-b':'sunkenTemple','shiba-c':'waterfallHollow'};
export const L1_SECTIONS_EXTENDED = [[-8,26,'start'],[26,65,'highRoad'],[65,92,'clearing'],[92,112,'treatLedge'],[112,128,'lilyPond'],[128,163,'canopy'],[163,186,'boneSwitch'],[186,201,'planks'],[201,240,'belly'],[240,249,'lastGap'],[249,324,'canopy'],[324,362,'lastGap'],[362,417,'coconutRun'],[417,438,'fork'],[438,533,'sunkenTemple'],[533,548,'gateApproach']];
export const L1_COCONUT = {start:363,end:414,checkpoint:360,delay:1.6,base:6.4,max:9,catchAt:2,cameraStart:361,cameraEnd:416,log:[376,376.9],pit:[399,402.5]};
export const L1_CHASE_RAW_ITEMS = [...[-3.2,-1.6,0,1.6,3.2].map(x=>({kind:'pack',x,y:0,d:389})),{kind:'stack',x:2.8,y:0,d:409,height:2}];
// Proposed, NOT owner-approved: stagger the five wall packs to permit one forward pass.
export const L1_CHASE_CANDIDATE_ITEMS = [...[-3.2,-1.6,0,1.6,3.2].map((x,i)=>({kind:'pack',x,y:0,d:385+i*2})),{kind:'stack',x:2.8,y:0,d:409,height:2}];
const blink=(x,dd,phase,group)=>({kind:'blink',x,y:0,dd,params:{on:1.8,off:.8,phase,group}});
const rawPieces=[{kind:'floorEnd',x:-1,y:0,dd:82},blink(-1,82.5,0,'st-a'),blink(1,85,.9,'st-a'),blink(0,87.5,0,'st-b'),{kind:'pack',x:0,y:0,dd:89.5},{kind:'pack',x:1.2,y:0,dd:91.5},{kind:'floorStart',x:1.2,y:0,dd:92}];
const route=pieces=>pieces.slice(1).map((_,from)=>({from,to:from+1,move:pieces[from].kind==='pack'?'bounceHeld':'held'}));
export const L1_TEMPLE_RAW_PATTERN = {id:'l1-temple-raw',tier:1,pieces:rawPieces,route:route(rawPieces)};
const safePieces=[...rawPieces.slice(0,3),{kind:'lunch',x:0,y:0,dd:86.25},...rawPieces.slice(3)];
// Proposed permanent rest; activation requires an explicit owner placement decision.
export const L1_TEMPLE_CANDIDATE_PATTERN = {id:'l1-temple-candidate',tier:1,pieces:safePieces,route:route(safePieces)};
