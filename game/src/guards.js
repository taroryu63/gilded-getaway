// guards.js — bank guards walking their patrol routes. A guard walks tile to
// tile along its waypoint loop, pauses at each corner, and turns smoothly.
// Its vision is a cone: if the thief stands inside the cone, close enough,
// with a clear line of sight, the guard is "seeing" and the alarm fills.

import { TILE, angleLerp, dist, inCone, lineOfSight } from './geometry.js';
import { tileCenter } from './levels.js';

export const GUARD_SIGHT = 168;      // px, how far a guard can see
export const GUARD_HALF_ANGLE = 0.56; // radians, half of the vision cone

export class Guard {
  constructor(def) {
    this.points = def.path.map(([tx, ty]) => tileCenter(tx, ty));
    this.speed = def.speed;
    this.pauseTime = def.pause ?? 0.6;
    this.x = this.points[0].x;
    this.y = this.points[0].y;
    this.target = 1 % this.points.length;
    const next = this.points[this.target];
    this.facing = Math.atan2(next.y - this.y, next.x - this.x);
    this.wait = 0;
    this.seeing = false;
    this.alert = 0; // 0..1, how locked-on this guard is (drives the "!" mark)
  }

  update(dt, speedScale) {
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    const goal = this.points[this.target];
    const d = dist(this.x, this.y, goal.x, goal.y);
    const step = this.speed * speedScale * dt;
    if (d <= step) {
      this.x = goal.x;
      this.y = goal.y;
      this.target = (this.target + 1) % this.points.length;
      this.wait = this.pauseTime;
    } else {
      const want = Math.atan2(goal.y - this.y, goal.x - this.x);
      this.facing = angleLerp(this.facing, want, Math.min(1, dt * 10));
      this.x += Math.cos(this.facing) * step;
      this.y += Math.sin(this.facing) * step;
    }
  }

  // Can this guard see the thief right now?
  sees(px, py, grid, smokes) {
    const d = dist(this.x, this.y, px, py);
    if (d > GUARD_SIGHT) return false;
    const ang = Math.atan2(py - this.y, px - this.x);
    if (!inCone(this.facing, ang, GUARD_HALF_ANGLE)) return false;
    return lineOfSight(this.x, this.y, px, py, grid.opaqueAt, smokes);
  }
}

export { TILE };
