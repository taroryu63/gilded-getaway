// audio.js — every sound is synthesised with WebAudio at play time; the game
// ships no audio files. A tiny helper plays short shaped tones: footsteps,
// the soft chime of loot, the alarm's rising beep, the sting of an arrest
// and the little arpeggio of a clean getaway.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur, type = 'sine', gain = 0.08, when = 0, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  step(tiptoe) {
    this.tone(tiptoe ? 190 : 150, 0.05, 'triangle', tiptoe ? 0.015 : 0.03);
  }

  pickup() {
    this.tone(880, 0.09, 'sine', 0.07);
    this.tone(1320, 0.14, 'sine', 0.06, 0.07);
  }

  gem() {
    this.tone(660, 0.12, 'sine', 0.08);
    this.tone(880, 0.12, 'sine', 0.08, 0.1);
    this.tone(1100, 0.2, 'sine', 0.08, 0.2);
    this.tone(1760, 0.3, 'sine', 0.05, 0.3);
  }

  smoke() {
    this.tone(320, 0.25, 'sawtooth', 0.02, 0, -220);
  }

  alarmBeep(stage) {
    this.tone(980 + stage * 160, 0.1, 'square', 0.035);
  }

  stageUp() {
    this.tone(520, 0.12, 'square', 0.06);
    this.tone(780, 0.18, 'square', 0.06, 0.1);
  }

  busted() {
    this.tone(392, 0.2, 'sawtooth', 0.09);
    this.tone(330, 0.2, 'sawtooth', 0.09, 0.16);
    this.tone(262, 0.45, 'sawtooth', 0.1, 0.32);
  }

  getaway() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.tone(n, 0.16, 'triangle', 0.08, i * 0.11));
  }
}
