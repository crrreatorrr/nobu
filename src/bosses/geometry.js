// Horizontal segment/disc tests used by floor attacks and solid cage cover.
const AXES = ['x', 'y', 'z'];
export function segmentDistanceSq(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / length)) : 0;
  return (px - ax - t * dx) ** 2 + (pz - az - t * dz) ** 2;
}
export function segmentBoxTime(a, b, box) {
  let near = 0, far = 1;
  for (const axis of AXES) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-8) {
      if (a[axis] < box.min[axis] || a[axis] > box.max[axis]) return Infinity;
    } else {
      let t0 = (box.min[axis] - a[axis]) / delta, t1 = (box.max[axis] - a[axis]) / delta;
      if (t0 > t1) { const t = t0; t0 = t1; t1 = t; }
      near = Math.max(near, t0); far = Math.min(far, t1);
      if (near > far) return Infinity;
    }
  }
  return near;
}
