// Shared with the feasibility audit; values preserve the shipped Scratchpost Canyon chase.
export const CHASE_TUNING = Object.freeze({ base: 6.7, max: 10.5, catchAt: 2.4, nearGap: 5, farGap: 9, nearSlope: .375, farSlope: .575 });
export function chaseSpeed(gap, speed = 7, catchUp = 1, dda = 1) {
  const c = CHASE_TUNING;
  return (gap < c.nearGap ? c.base : gap < c.farGap ? c.base + (gap - c.nearGap) * c.nearSlope * catchUp : Math.min(c.max, 8.2 + (gap - c.farGap) * c.farSlope * catchUp)) * (speed / c.base) * dda;
}
