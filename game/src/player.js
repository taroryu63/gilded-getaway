// player.js — the thief. Arrow keys or WASD move, Shift tiptoes (slower, and
// only half as visible to watching eyes), Space drops a smoke pellet: a
// short-lived cloud that sight cannot cross, bought with a limited count per
// floor. Movement is smooth but collides with walls and cover as a circle.

import { circleHitsSolid } from './geometry.js';

export const THIEF_RADIUS = 13;
const WALK_SPEED = 128;
const TIPTOE_SPEED = 74;

export class Thief {
  constructor(start, smokeCount) {
    this.x = start.x;
    this.y = start.y;
    this.facing = -Math.PI / 2;
    this.moving = false;
    this.tiptoe = false;
    this.smokeLeft = smokeCount;
    this.stepPhase = 0;
  }

  update(dt, keys, grid) {
    let dx = 0, dy = 0;
    if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
    if (keys.has('arrowright') || keys.has('d')) dx += 1;
    if (keys.has('arrowup') || keys.has('w')) dy -= 1;
    if (keys.has('arrowdown') || keys.has('s')) dy += 1;
    this.tiptoe = keys.has('shift');
    this.moving = dx !== 0 || dy !== 0;
    if (!this.moving) return;
    const len = Math.hypot(dx, dy);
    const speed = this.tiptoe ? TIPTOE_SPEED : WALK_SPEED;
    const vx = (dx / len) * speed * dt;
    const vy = (dy / len) * speed * dt;
    this.facing = Math.atan2(dy, dx);
    // Slide along walls: try the full move, then each axis alone.
    if (!circleHitsSolid(this.x + vx, this.y + vy, THIEF_RADIUS, grid.solidAt)) {
      this.x += vx;
      this.y += vy;
    } else if (!circleHitsSolid(this.x + vx, this.y, THIEF_RADIUS, grid.solidAt)) {
      this.x += vx;
    } else if (!circleHitsSolid(this.x, this.y + vy, THIEF_RADIUS, grid.solidAt)) {
      this.y += vy;
    }
    this.stepPhase += dt * (this.tiptoe ? 6 : 10);
  }

  // Drop a smoke pellet at the thief's feet. Returns the cloud, or null when
  // the pouch is empty.
  dropSmoke() {
    if (this.smokeLeft <= 0) return null;
    this.smokeLeft -= 1;
    return { x: this.x, y: this.y, r: 58, life: 4.2 };
  }
}
