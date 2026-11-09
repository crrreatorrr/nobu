// Countable placements in Roomba Rush. Rugs are cleared remotely by the Vacuum Dock.
export const RIDE_BREAKABLES = [
  { kind: 'pack', x: -2.6, y: 0, d: 64 }, { kind: 'pack', x: 0, y: 0, d: 67.5 }, { kind: 'pack', x: 2.6, y: 0, d: 71 },
  { kind: 'rug', x: -2.6, y: 0, d: 118 }, { kind: 'rug', x: 2.6, y: 0, d: 118 },
  { kind: 'snacks', x: 0, y: 0, d: 128 },
  { kind: 'zipped', x: -2.4, y: 0, d: 157 }, { kind: 'pack', x: 2.4, y: 0, d: 164 },
  { kind: 'oneUp', x: 0, y: 1.9, d: 187 },
  { kind: 'sphere', x: 0, y: 0, d: 212 },
  { kind: 'cat', x: -2.6, y: 0, d: 219 }, { kind: 'pack', x: 2.6, y: 0, d: 226 },
  { kind: 'rug', x: 0, y: 0, d: 258 }, { kind: 'rug', x: -3, y: 0, d: 258 },
  { kind: 'pack', x: -2.6, y: 0, d: 267 }, { kind: 'pack', x: 0, y: 0, d: 270 },
  { kind: 'vacSwitch', x: 0, y: 0, d: 286 },
];

// Main-lap extension countables; Sofa is a separate loop that returns before continuing.
export const RIDE_EXTENSION_BREAKABLES = [
  {kind:'pack',x:-2.6,y:0,d:140},{kind:'pack',x:-2.6,y:0,d:148},{kind:'pack',x:-2.6,y:0,d:160},
  {kind:'zipped',x:-2.6,y:0,d:168},
  {kind:'pack',x:-1.2,y:2.2,d:286},{kind:'pack',x:1.2,y:2.2,d:288.5},
  {kind:'cat',x:-3.4,y:0,d:385},{kind:'pack',x:2.6,y:0,d:395},
  {kind:'cat',x:3.4,y:0,d:399},{kind:'pack',x:-2.6,y:0,d:409},
  {kind:'snacks',x:0,y:0,d:417},
];
export const RIDE_SOFA_BREAKABLES = [
  {kind:'pack',x:-2.6,y:2.6,d:186},{kind:'pack',x:-2.6,y:2.6,d:198},
];
