// geometry.js — small vector, rectangle and line-of-sight helpers shared by
// the thief, the guards and the cameras. The world is a tile grid; a tile is
// solid when it blocks movement, and opaque when it also blocks sight.

export const TILE = 40;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist(ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

// Shortest signed turn from angle a to angle b, in (-PI, PI].
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function angleLerp(a, b, t) {
  return a + angleDelta(a, b) * t;
}

// Is angle `a` within `half` radians of the facing angle `f`?
export function inCone(f, a, half) {
  return Math.abs(angleDelta(f, a)) <= half;
}

// Circle vs tile-grid collision: true when the circle at (x, y) with radius r
// overlaps any solid tile. `solidAt(tx, ty)` answers per tile.
export function circleHitsSolid(x, y, r, solidAt) {
  const minTx = Math.floor((x - r) / TILE), maxTx = Math.floor((x + r) / TILE);
  const minTy = Math.floor((y - r) / TILE), maxTy = Math.floor((y + r) / TILE);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!solidAt(tx, ty)) continue;
      const nx = clamp(x, tx * TILE, tx * TILE + TILE);
      const ny = clamp(y, ty * TILE, ty * TILE + TILE);
      const dx = x - nx, dy = y - ny;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

// Line of sight between two points: step along the segment and fail if any
// sampled point sits inside an opaque tile or inside a smoke cloud (smoke
// blocks sight both ways, which is what makes the thief's pellets useful).
export function lineOfSight(x0, y0, x1, y1, opaqueAt, smokes) {
  const d = dist(x0, y0, x1, y1);
  const steps = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    // Samples hugging the eye are skipped: a camera is mounted inside its
    // own wall tile, which must not blind it.
    if (d * t < 24) continue;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    if (opaqueAt(Math.floor(x / TILE), Math.floor(y / TILE))) return false;
    for (const s of smokes) {
      const dx = x - s.x, dy = y - s.y;
      if (dx * dx + dy * dy < s.r * s.r) return false;
    }
  }
  return true;
}
