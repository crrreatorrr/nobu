// Optional post-Queen rewards. Positions are authored track coordinates.
// A permanent launch pad, reachable with the original double jump, puts every
// new ledge 6.25m above its launch surface in world space (L1 retains its
// original Moon9 and clears its launch by6.232965m). Each exported host
// MOON_LEDGES entry also lists nearby authored surfaces; launch itself is included
// by the helper. Runtime moonExtras records contain actual solid tops/edge distances.
export const MOON_RETURN_ROUTES = Object.freeze({
  1: { x: 2.6, y: 9, d: 301, launch: { x: -.6, y: 2.7, d: 298.5, w: 1.2, dd: 1.2 }, existing: true, nearbySurfaces: [{ x: -.6, y: 2.2, d: 298.5, kind: 'Canopy branch' }] },
  2: { x: 0, y: 7.5, d: 266.5, launch: { x: 0, y: 1.25, d: 262.5 }, nearbySurfaces: [{ x: -1.8, y: 1, d: 267.5, kind: 'closed Mystery top' }, { y: 0, kind: 'Fort floor' }] },
  3: { x: -3, y: 9, d: 84, launch: { x: -3, y: 2.75, d: 80 }, nearbySurfaces: [{ y: 0, kind: 'Rug Puzzle floor' }] },
  4: { x: 3, y: 9, d: 28, launch: { x: 3, y: 2.75, d: 24 }, nearbySurfaces: [{ y: 0, kind: 'Hallway floor' }] },
  ride: { x: -2.6, y: 11.25, d: 199, launch: { x: -2.6, y: 5, d: 195 }, detour: true, nearbySurfaces: [{ y: 2.6, kind: 'Sofa floor' }, { x: -2.6, y: 3.6, d: 198, kind: 'closed Backpack top' }] },
  cave: { x: 0, y: 9, d: 14, launch: { x: 0, y: 2.75, d: 10 }, nearbySurfaces: [{ y: 0, kind: 'Grotto floor' }, { x: -2.4, y: 1, d: 14, kind: 'closed Backpack top' }, { x: 2.4, y: 1, d: 14, kind: 'closed Backpack top' }] },
});

export const COLORED_RETURN_ROUTES = Object.freeze({
  1: { color: 'green', platforms: [[-3.2, 1, 32, 1.6, 1.8], [-3.2, 1.8, 35.5, 1.6, 1.8], [-3.2, 2.6, 39, 2, 2.4]] },
  2: { color: 'yellow', platforms: [[-1.1, 9, 150, 1.4, 1.8], [-1.1, 9.8, 153.5, 1.4, 1.8], [-1.1, 10.6, 157, 1.6, 2.4]], detour: true },
});
