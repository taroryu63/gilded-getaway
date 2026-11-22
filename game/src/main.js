// main.js — boots Gilded Getaway, owns the run state (title, playing, caught,
// floor cleared, game cleared), feeds input to the thief, and ties the
// modules together once a frame: move, watch, alarm, loot, getaway.
//
// URL parameters exist for screenshots and testing: ?level=2 starts on that
// floor, ?pos=17,8 places the thief on a tile, ?alarm=40 and ?stage=1 preset
// the alarm, ?screen=title shows the title (the default).

import { LEVELS, buildGrid, tileCenter } from './levels.js';
import { Guard } from './guards.js';
import { Camera } from './cameras.js';
import { Thief } from './player.js';
import { Alarm } from './alarm.js';
import { SoundBank } from './audio.js';
import { drawPlay, drawTitle, drawCaught, drawLevelClear, drawGameClear } from './render.js';
import { dist } from './geometry.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const sound = new SoundBank();

const keys = new Set();
let screen = 'title';
let levelIndex = 0;
let rt = null;         // the live run of the current floor
let totalScore = 0;
let lastStepMark = 0;

function startLevel(index) {
  const level = LEVELS[index];
  const grid = buildGrid(level);
  const start = tileCenter(level.playerStart[0], level.playerStart[1]);
  if (params.has('pos')) {
    const [tx, ty] = params.get('pos').split(',').map(Number);
    if (Number.isFinite(tx) && Number.isFinite(ty)) {
      const p = tileCenter(tx, ty);
      start.x = p.x;
      start.y = p.y;
    }
  }
  const alarm = new Alarm();
  if (params.has('alarm')) alarm.meter = Math.min(99, Number(params.get('alarm')) || 0);
  if (params.has('stage')) alarm.stage = Math.min(2, Number(params.get('stage')) || 0);
  rt = {
    grid,
    thief: new Thief(start, level.smoke),
    guards: level.guards.map(d => new Guard(d)),
    cameras: level.cameras.map(d => new Camera(d)),
    alarm,
    bags: level.bags.map(([tx, ty]) => ({ ...tileCenter(tx, ty), taken: false })),
    gemPos: tileCenter(level.gem[0], level.gem[1]),
    gemTaken: false,
    smokes: [],
    time: 0,
    score: 0,
  };
  screen = 'play';
}

function currentLevel() {
  return LEVELS[levelIndex];
}

function onCaught() {
  screen = 'caught';
  sound.busted();
}

function onLevelClear() {
  const level = currentLevel();
  const timeBonus = Math.max(0, 600 - Math.floor(rt.time) * 2);
  rt.score += 250 + timeBonus;
  totalScore += rt.score;
  sound.getaway();
  screen = 'levelclear';
}

function update(dt) {
  const level = currentLevel();
  rt.time += dt;
  rt.thief.update(dt, keys, rt.grid);
  const stepMark = Math.floor(rt.thief.stepPhase / Math.PI);
  if (rt.thief.moving && stepMark !== lastStepMark) {
    lastStepMark = stepMark;
    sound.step(rt.thief.tiptoe);
  }
  for (const s of rt.smokes) s.life -= dt;
  rt.smokes = rt.smokes.filter(s => s.life > 0);
  const smokeView = rt.smokes.map(({ x, y, r }) => ({ x, y, r }));

  for (const g of rt.guards) g.update(dt, rt.alarm.guardSpeedScale());
  for (const c of rt.cameras) c.update(rt.time);

  let watchers = 0;
  for (const g of rt.guards) {
    g.seeing = g.sees(rt.thief.x, rt.thief.y, rt.grid, smokeView);
    g.alert = Math.max(0, Math.min(1, g.alert + (g.seeing ? dt * 2.2 : -dt * 1.4)));
    if (g.seeing) watchers += 1;
  }
  for (const c of rt.cameras) {
    c.seeing = c.sees(rt.thief.x, rt.thief.y, rt.grid, smokeView);
    if (c.seeing) watchers += 1;
  }
  const event = rt.alarm.update(dt, Math.min(2, watchers), rt.thief.tiptoe);
  if (event === 'stage-up') {
    sound.stageUp();
    if (rt.alarm.busted) return onCaught();
  }
  if (watchers > 0 && Math.floor(rt.time * 2) !== Math.floor((rt.time - dt) * 2)) {
    sound.alarmBeep(rt.alarm.stage);
  }

  for (const bag of rt.bags) {
    if (!bag.taken && dist(rt.thief.x, rt.thief.y, bag.x, bag.y) < 26) {
      bag.taken = true;
      rt.score += 100;
      sound.pickup();
    }
  }
  if (!rt.gemTaken && dist(rt.thief.x, rt.thief.y, rt.gemPos.x, rt.gemPos.y) < 28) {
    rt.gemTaken = true;
    rt.score += 500;
    rt.alarm.trip();
    sound.gem();
  }
  if (rt.gemTaken) {
    const exitC = tileCenter(level.exit[0], level.exit[1]);
    if (dist(rt.thief.x, rt.thief.y, exitC.x, exitC.y) < 30) onLevelClear();
  }
}

function draw(t) {
  if (screen === 'title') return drawTitle(ctx, t);
  if (screen === 'gameclear') return drawGameClear(ctx, totalScore);
  drawPlay(ctx, currentLevel(), rt, rt.grid, t);
  if (screen === 'caught') drawCaught(ctx, rt);
  if (screen === 'levelclear') {
    drawLevelClear(ctx, currentLevel(), rt, levelIndex === LEVELS.length - 1);
  }
}

let lastTs = 0;
function frame(ts) {
  const t = ts / 1000;
  const dt = Math.min(0.033, lastTs ? t - lastTs : 0.016);
  lastTs = t;
  if (screen === 'play') update(dt);
  draw(t);
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  sound.ensure();
  if (k === 'm') sound.muted = !sound.muted;
  if (screen === 'title' && k === 'enter') {
    totalScore = 0;
    levelIndex = 0;
    startLevel(0);
  } else if (screen === 'caught' && k === 'r') {
    startLevel(levelIndex);
  } else if (screen === 'caught' && k === 'enter') {
    screen = 'title';
  } else if (screen === 'levelclear' && k === 'enter') {
    if (levelIndex === LEVELS.length - 1) {
      screen = 'gameclear';
    } else {
      levelIndex += 1;
      startLevel(levelIndex);
    }
  } else if (screen === 'gameclear' && k === 'enter') {
    screen = 'title';
  } else if (screen === 'play' && k === ' ') {
    const cloud = rt.thief.dropSmoke();
    if (cloud) {
      rt.smokes.push(cloud);
      sound.smoke();
    }
  }
  keys.add(k === ' ' ? 'space' : k);
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  keys.delete(k === ' ' ? 'space' : k);
});

// Screenshot / test entry points: jump straight into a floor when asked.
if (params.has('level')) {
  levelIndex = Math.max(0, Math.min(LEVELS.length - 1, (Number(params.get('level')) || 1) - 1));
  startLevel(levelIndex);
}
requestAnimationFrame(frame);
