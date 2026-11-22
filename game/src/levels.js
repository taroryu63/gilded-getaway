// levels.js — the three floors of the Aurelia Bank, one heist each.
// Map legend: '#' wall, 'X' cover (a marble pillar or a heavy desk: blocks
// movement and sight), 'D' a doorway in a partition wall, '.' marble floor,
// ',' carpet (floor, drawn softer). Entities are placed by tile below the map.

export const COLS = 32;
export const ROWS = 18;

const LOBBY = [
  '################################',
  '#..........#.........#.........#',
  '#..X.......#....X....#....X....#',
  '#..X.......D.........#.........#',
  '#..........#.........#....XX...#',
  '#....X.....#....X....D....XX...#',
  '#..........#.........#.........#',
  '#..............................#',
  '#..............................#',
  '#..........#.........#.........#',
  '#....X.....#....X....#....X....#',
  '#..........D.........#.........#',
  '#..X.......#.........#....XX...#',
  '#..X.......#....X....D....XX...#',
  '#..........#.........#.........#',
  '#..............................#',
  '#..............................#',
  '################################',
];

const DEPOSIT_HALL = [
  '################################',
  '#..............................#',
  '#..XXXX....XXXX....XXXX....X...#',
  '#..............................#',
  '#....#########################',
  '#..............................#',
  '#..X......X.......X.......X....#',
  '######D########D########D#######',
  '#..............................#',
  '#..............................#',
  '#..X......X.......X.......X....#',
  '######D########D########D#######',
  '#..............................#',
  '#..............................#',
  '#....#########################',
  '#..XXXX....XXXX....XXXX....X...#',
  '#..............................#',
  '################################',
];

const VAULT = [
  '################################',
  '#..............................#',
  '#..X....X..........X....X......#',
  '#..............................#',
  '#......##############..........#',
  '#......#............#....X.....#',
  '#..X...#............D..........#',
  '#......#............#..........#',
  '#......D.....XX.....#....X.....#',
  '#......#............#..........#',
  '#..X...#............D..........#',
  '#......##############..........#',
  '#..............................#',
  '#..X....X..........X....X......#',
  '#..............................#',
  '#......X....X....X....X........#',
  '#..............................#',
  '################################',
];

export const LEVELS = [
  {
    name: 'Floor 1 · The Marble Lobby',
    target: 'The Aurelion Sapphire',
    gemColor: '#39c2d7',
    map: LOBBY,
    playerStart: [2, 15],
    exit: [1, 16],
    gem: [28, 2],
    bags: [[5, 2], [16, 13], [27, 15]],
    smoke: 2,
    guards: [
      { path: [[4, 7], [27, 7]], speed: 58, pause: 0.8 },
      { path: [[27, 12], [13, 12], [13, 15], [27, 15]], speed: 52, pause: 0.6 },
    ],
    cameras: [
      { at: [16, 0], base: Math.PI / 2, sweep: 0.85, period: 6.5, phase: 0 },
    ],
  },
  {
    name: 'Floor 2 · Safe Deposit Hall',
    target: 'The Aurelion Ruby',
    gemColor: '#e03a5f',
    map: DEPOSIT_HALL,
    playerStart: [2, 16],
    exit: [1, 16],
    gem: [29, 1],
    bags: [[8, 1], [20, 5], [5, 13], [28, 13]],
    smoke: 2,
    guards: [
      { path: [[3, 5], [28, 5]], speed: 62, pause: 0.7 },
      { path: [[28, 9], [3, 9]], speed: 66, pause: 0.5 },
      { path: [[15, 13], [15, 15], [24, 15], [24, 13]], speed: 56, pause: 0.6 },
    ],
    cameras: [
      { at: [8, 4], base: Math.PI / 2, sweep: 0.7, period: 5.5, phase: 1.2 },
      { at: [24, 11], base: -Math.PI / 2, sweep: 0.7, period: 5.5, phase: 3.4 },
    ],
  },
  {
    name: 'Floor 3 · The Aurelia Vault',
    target: 'The Crown Diamond',
    gemColor: '#dfeeff',
    map: VAULT,
    playerStart: [2, 16],
    exit: [1, 16],
    gem: [12, 8],
    bags: [[29, 1], [29, 8], [3, 8], [16, 15], [28, 15]],
    smoke: 3,
    guards: [
      { path: [[4, 3], [27, 3]], speed: 66, pause: 0.6 },
      { path: [[27, 13], [4, 13]], speed: 70, pause: 0.5 },
      { path: [[24, 5], [24, 10], [29, 10], [29, 5]], speed: 60, pause: 0.5 },
      { path: [[9, 6], [9, 10]], speed: 48, pause: 1.0 },
    ],
    cameras: [
      { at: [16, 0], base: Math.PI / 2, sweep: 0.95, period: 5.0, phase: 0.6 },
      { at: [31, 8], base: Math.PI, sweep: 0.6, period: 4.2, phase: 2.1 },
    ],
  },
];

// Normalise a level's map to exactly ROWS x COLS so a short row can never
// break the grid, and build the solid / opaque lookups the rest of the game
// queries by tile.
export function buildGrid(level) {
  const tiles = [];
  for (let ty = 0; ty < ROWS; ty++) {
    const row = (level.map[ty] ?? '').padEnd(COLS, '#').slice(0, COLS);
    tiles.push(row.split(''));
  }
  const at = (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
    return tiles[ty][tx];
  };
  return {
    tiles,
    at,
    solidAt: (tx, ty) => {
      const c = at(tx, ty);
      return c === '#' || c === 'X';
    },
    opaqueAt: (tx, ty) => {
      const c = at(tx, ty);
      return c === '#' || c === 'X';
    },
  };
}

export function tileCenter(tx, ty) {
  return { x: tx * 40 + 20, y: ty * 40 + 20 };
}
