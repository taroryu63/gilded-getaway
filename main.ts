// Gilded Getaway — hand-in program (Node 22, standard library only).
//
// The game itself is the static site in game/ (game/index.html plus its ES
// modules; no build step, no network). This program hands it in: it copies
// game/ and screenshots/ from beside this file into the output directory and
// writes dossier.json there with buildDossier from the vendored make.fun
// library, exactly as the gate expects. The grader runs it twice and both
// runs must produce the same bytes, so nothing here depends on time, random
// numbers or the environment beyond MAKEFUN_OUTPUT_DIR.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy the game first, then the screenshots, then let the library summarise
// the output folder into the dossier the judge reads.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below are the scorer's own (reference/gate.json): only
// text_max_bytes shapes the dossier's bytes; the rest refuse, here, an entry
// the scorer would refuse anyway (over 4 screenshots or one over 256 KiB,
// over 993 files or 48 MiB under game/, a game path over 1000 bytes).
const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
const dossier = buildDossier(outputDir, GATE_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);
