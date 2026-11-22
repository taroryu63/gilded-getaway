// cameras.js — wall-mounted security cameras. A camera never moves, but its
// lens sweeps back and forth across its arc; its cone is longer and narrower
// than a guard's, and being caught in it fills the alarm faster. Cameras are
// the reason the thief reads the room before crossing it.

import { angleDelta, dist, inCone, lineOfSight } from './geometry.js';
import { tileCenter } from './levels.js';

export const CAMERA_SIGHT = 185;
export const CAMERA_HALF_ANGLE = 0.42;

export class Camera {
  constructor(def) {
    const c = tileCenter(def.at[0], def.at[1]);
    this.x = c.x;
    this.y = c.y;
    this.base = def.base;
    this.sweep = def.sweep;
    this.period = def.period;
    this.phase = def.phase ?? 0;
    this.facing = def.base;
    this.seeing = false;
  }

  update(t) {
    // A smooth pendulum sweep around the base direction.
    this.facing = this.base + Math.sin(t * (Math.PI * 2 / this.period) + this.phase) * this.sweep;
  }

  sees(px, py, grid, smokes) {
    const d = dist(this.x, this.y, px, py);
    if (d > CAMERA_SIGHT) return false;
    const ang = Math.atan2(py - this.y, px - this.x);
    if (!inCone(this.facing, ang, CAMERA_HALF_ANGLE)) return false;
    return lineOfSight(this.x, this.y, px, py, grid.opaqueAt, smokes);
  }
}

export { angleDelta };
