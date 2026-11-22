// render.js — everything the player (and the judge) sees: the bank's marble
// floors and gilded pillars, the getaway door, the loot, the sweeping vision
// cones of guards and cameras, the thief, the smoke, and the HUD with the
// alarm meter. Drawing only; the rules live in the other modules.

import { TILE, clamp } from './geometry.js';
import { COLS, ROWS } from './levels.js';
import { GUARD_SIGHT, GUARD_HALF_ANGLE } from './guards.js';
import { CAMERA_SIGHT, CAMERA_HALF_ANGLE } from './cameras.js';

export const HUD_H = 80;
export const VIEW_W = COLS * TILE;   // 1280
export const VIEW_H = ROWS * TILE;   // 720

// A vision cone as a fan of rays, each ray stopped by the first opaque tile,
// so cones bend around pillars and walls instead of shining through them.
// Marching starts a little way out from the eye: a camera sits inside its
// own wall tile, and that tile must not swallow the whole cone.
function conePath(ctx, x, y, facing, half, sight, opaqueAt) {
  const rays = 18;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= rays; i++) {
    const ang = facing - half + (2 * half * i) / rays;
    let d = sight;
    for (let s = 26; s < sight; s += 6) {
      const px = x + Math.cos(ang) * s, py = y + Math.sin(ang) * s;
      if (opaqueAt(Math.floor(px / TILE), Math.floor(py / TILE))) { d = s; break; }
    }
    ctx.lineTo(x + Math.cos(ang) * d, y + Math.sin(ang) * d);
  }
  ctx.closePath();
}

function drawRoom(ctx, grid) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const c = grid.tiles[ty][tx];
      const x = tx * TILE, y = ty * TILE;
      if (c === '#') {
        ctx.fillStyle = '#232a47';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#2e3760';
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(x, y + TILE - 3, TILE, 3);
      } else if (c === 'X') {
        ctx.fillStyle = '#39406b';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#4a548a';
        ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(x + 5, y + 5, TILE - 10, 3);
        ctx.fillRect(x + 5, y + TILE - 8, TILE - 10, 3);
      } else {
        const dark = (tx + ty) % 2 === 0;
        ctx.fillStyle = c === ',' ? (dark ? '#5e2436' : '#662a3d') : (dark ? '#aeb6cc' : '#bcc3d6');
        ctx.fillRect(x, y, TILE, TILE);
        if (c === 'D') {
          ctx.fillStyle = '#7a5a17';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#c9a227';
          ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          ctx.fillStyle = '#7a5a17';
          ctx.fillRect(x + 7, y + 7, TILE - 14, TILE - 14);
        }
      }
    }
  }
}

function drawExit(ctx, exitTile, open) {
  const x = exitTile[0] * TILE, y = exitTile[1] * TILE;
  ctx.fillStyle = open ? '#1f7a3d' : '#5a1f24';
  ctx.fillRect(x - 6, y - 6, TILE + 12, TILE + 12);
  ctx.fillStyle = open ? '#2fae56' : '#8a3038';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY', x + TILE / 2, y + TILE / 2 + 3);
}

function drawLoot(ctx, level, rt, t) {
  for (const bag of rt.bags) {
    if (bag.taken) continue;
    const bob = Math.sin(t * 3 + bag.x) * 2;
    ctx.fillStyle = '#8a6d1f';
    ctx.beginPath();
    ctx.ellipse(bag.x, bag.y + 4 + bob, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c33c';
    ctx.beginPath();
    ctx.ellipse(bag.x, bag.y + bob, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5a17';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', bag.x, bag.y + 4 + bob);
  }
  if (!rt.gemTaken) {
    const g = rt.gemPos;
    const pulse = 1 + Math.sin(t * 4) * 0.12;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = level.gemColor;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 15);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 15);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(level.target.toUpperCase(), g.x, g.y - 22);
  }
}

function drawCones(ctx, rt, grid) {
  for (const cam of rt.cameras) {
    ctx.fillStyle = cam.seeing ? 'rgba(255,64,48,.42)' : 'rgba(255,120,50,.30)';
    conePath(ctx, cam.x, cam.y, cam.facing, CAMERA_HALF_ANGLE, CAMERA_SIGHT, grid.opaqueAt);
    ctx.fill();
  }
  for (const g of rt.guards) {
    ctx.fillStyle = g.seeing ? 'rgba(255,60,40,.38)' : 'rgba(255,214,90,.30)';
    conePath(ctx, g.x, g.y, g.facing, GUARD_HALF_ANGLE, GUARD_SIGHT, grid.opaqueAt);
    ctx.fill();
  }
}

function drawCamera(ctx, cam, t) {
  ctx.fillStyle = '#141828';
  ctx.fillRect(cam.x - 12, cam.y - 12, 24, 24);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 2;
  ctx.strokeRect(cam.x - 12, cam.y - 12, 24, 24);
  ctx.fillStyle = '#39406b';
  ctx.fillRect(cam.x - 8, cam.y - 8, 16, 16);
  const lx = cam.x + Math.cos(cam.facing) * 7, ly = cam.y + Math.sin(cam.facing) * 7;
  ctx.fillStyle = '#0b0e1a';
  ctx.beginPath();
  ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
  ctx.fill();
  const led = cam.seeing || Math.sin(t * 2.4) > 0.55;
  ctx.fillStyle = led ? '#ff4030' : '#571f1a';
  ctx.beginPath();
  ctx.arc(cam.x + 6, cam.y - 6, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawGuard(ctx, g) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(g.x, g.y + 11, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#26355e';
  ctx.beginPath();
  ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#31477c';
  ctx.beginPath();
  ctx.arc(g.x, g.y - 3, 9, 0, Math.PI * 2);
  ctx.fill();
  // Cap brim points the way the guard faces.
  ctx.strokeStyle = '#e8c33c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y - 3);
  ctx.lineTo(g.x + Math.cos(g.facing) * 13, g.y - 3 + Math.sin(g.facing) * 13);
  ctx.stroke();
  if (g.alert > 0.25) {
    ctx.fillStyle = g.alert > 0.8 ? '#ff4030' : '#ffb020';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 20);
  }
}

function drawThief(ctx, thief) {
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(thief.x, thief.y + 11, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const crouch = thief.tiptoe ? 3 : 0;
  ctx.fillStyle = '#15151f';
  ctx.beginPath();
  ctx.arc(thief.x, thief.y + crouch, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#23232f';
  ctx.beginPath();
  ctx.arc(thief.x, thief.y - 3 + crouch, 8.5, 0, Math.PI * 2);
  ctx.fill();
  // The gold stripe of the mask, across the eyes, facing the way she moves.
  ctx.strokeStyle = '#e8c33c';
  ctx.lineWidth = 3;
  const ex = Math.cos(thief.facing), ey = Math.sin(thief.facing);
  ctx.beginPath();
  ctx.moveTo(thief.x - ey * 6 + ex * 4, thief.y - 3 + crouch + ex * 6);
  ctx.lineTo(thief.x + ey * 6 + ex * 4, thief.y - 3 + crouch - ex * 6);
  ctx.stroke();
}

function drawSmoke(ctx, smokes) {
  for (const s of smokes) {
    const a = clamp(s.life / 4.2, 0, 1) * 0.55;
    ctx.fillStyle = `rgba(190,196,214,${a})`;
    for (const [ox, oy, r] of [[0, 0, 40], [-24, 8, 28], [24, 6, 30], [2, -20, 26], [-6, 20, 24]]) {
      ctx.beginPath();
      ctx.arc(s.x + ox, s.y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawHUD(ctx, level, rt) {
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(0, HUD_H - 3, VIEW_W, 3);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8c33c';
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.fillText('GILDED GETAWAY', 18, 33);
  ctx.fillStyle = '#aeb6cc';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(level.name, 18, 58);

  // The alarm meter: the one bar nobody may miss.
  const mx = 470, mw = 340, my = 26;
  ctx.fillStyle = '#aeb6cc';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(rt.alarm.tripped ? 'ALARM TRIPPED — GET OUT!' : 'ALARM', mx + mw / 2, my - 8);
  ctx.fillStyle = '#232a47';
  ctx.fillRect(mx, my, mw, 20);
  const frac = rt.alarm.meter / 100;
  ctx.fillStyle = frac > 0.66 ? '#ff4030' : frac > 0.33 ? '#ffb020' : '#e8c33c';
  ctx.fillRect(mx, my, mw * frac, 20);
  ctx.strokeStyle = '#4a548a';
  ctx.strokeRect(mx, my, mw, 20);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < rt.alarm.stage ? '#ff4030' : '#232a47';
    ctx.beginPath();
    ctx.arc(mx + 14 + i * 22, my + 36, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a548a';
    ctx.stroke();
  }
  ctx.fillStyle = '#aeb6cc';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`STAGE ${rt.alarm.stage}/3`, mx + 96, my + 40);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8c33c';
  ctx.font = 'bold 17px system-ui, sans-serif';
  const bagsTaken = rt.bags.filter(b => b.taken).length;
  ctx.fillText(`${rt.gemTaken ? '◆ STOLEN' : '◆ hidden'} · loot ${bagsTaken}/${rt.bags.length}`, VIEW_W - 18, 32);
  ctx.fillStyle = '#aeb6cc';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`smoke ×${rt.thief.smokeLeft} · ${fmtTime(rt.time)} · score ${rt.score}`, VIEW_W - 18, 58);
}

export function drawPlay(ctx, level, rt, grid, t) {
  ctx.save();
  ctx.clearRect(0, 0, VIEW_W, HUD_H + VIEW_H);
  drawHUD(ctx, level, rt);
  ctx.translate(0, HUD_H);
  drawRoom(ctx, grid);
  drawExit(ctx, level.exit, rt.gemTaken);
  drawLoot(ctx, level, rt, t);
  drawCones(ctx, rt, grid);
  drawSmoke(ctx, rt.smokes);
  for (const cam of rt.cameras) drawCamera(ctx, cam, t);
  for (const g of rt.guards) drawGuard(ctx, g);
  drawThief(ctx, rt.thief);
  ctx.restore();
}

function veil(ctx, alpha) {
  ctx.fillStyle = `rgba(5,7,16,${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, HUD_H + VIEW_H);
}

function centered(ctx, text, y, font, color) {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.fillText(text, VIEW_W / 2, y);
}

export function drawTitle(ctx, t) {
  veil(ctx, 1);
  centered(ctx, 'GILDED GETAWAY', 210, 'bold 64px system-ui, sans-serif', '#e8c33c');
  centered(ctx, 'One night. Three floors. Every gem in the Aurelia Bank.', 262, '20px system-ui, sans-serif', '#aeb6cc');
  const gemY = 330 + Math.sin(t * 2) * 6;
  ctx.fillStyle = '#39c2d7';
  ctx.beginPath();
  ctx.moveTo(VIEW_W / 2, gemY - 26);
  ctx.lineTo(VIEW_W / 2 + 20, gemY);
  ctx.lineTo(VIEW_W / 2, gemY + 30);
  ctx.lineTo(VIEW_W / 2 - 20, gemY);
  ctx.closePath();
  ctx.fill();
  centered(ctx, 'Cross each floor unseen. Dodge the guards’ cones and the cameras’ sweep,', 420, '17px system-ui, sans-serif', '#d6dbeb');
  centered(ctx, 'grab the prize jewel, fill your pockets on the way, and reach the GETAWAY door.', 448, '17px system-ui, sans-serif', '#d6dbeb');
  centered(ctx, 'Being watched fills the ALARM meter — three stages and you are arrested.', 476, '17px system-ui, sans-serif', '#d6dbeb');
  centered(ctx, 'Move: WASD / arrows · Tiptoe: Shift (half as visible) · Smoke pellet: Space · Mute: M', 530, '15px system-ui, sans-serif', '#8a93b2');
  centered(ctx, 'Press ENTER to start the heist', 600, 'bold 22px system-ui, sans-serif', '#fff');
}

export function drawCaught(ctx, rt) {
  veil(ctx, 0.72);
  centered(ctx, 'ARRESTED', 330, 'bold 56px system-ui, sans-serif', '#ff5040');
  centered(ctx, `The alarm reached stage 3 on the way to ${rt.score} points.`, 386, '19px system-ui, sans-serif', '#d6dbeb');
  centered(ctx, 'Press R to try this floor again · ENTER for the title', 470, '17px system-ui, sans-serif', '#aeb6cc');
}

export function drawLevelClear(ctx, level, rt, last) {
  veil(ctx, 0.72);
  centered(ctx, last ? 'THE VAULT IS EMPTY' : 'CLEAN GETAWAY', 300, 'bold 50px system-ui, sans-serif', '#2fae56');
  centered(ctx, `${level.target} stolen · score ${rt.score} · ${fmtTime(rt.time)}`, 356, '19px system-ui, sans-serif', '#d6dbeb');
  centered(ctx, last ? 'Press ENTER for the final tally' : 'Press ENTER for the next floor', 440, '17px system-ui, sans-serif', '#aeb6cc');
}

export function drawGameClear(ctx, total) {
  veil(ctx, 1);
  centered(ctx, 'A LEGEND OF THE NIGHT', 300, 'bold 52px system-ui, sans-serif', '#e8c33c');
  centered(ctx, `All three jewels of the Aurelia Bank, gone by morning.`, 356, '20px system-ui, sans-serif', '#d6dbeb');
  centered(ctx, `Final score: ${total}`, 410, 'bold 26px system-ui, sans-serif', '#fff');
  centered(ctx, 'Press ENTER to play again', 490, '17px system-ui, sans-serif', '#aeb6cc');
}
