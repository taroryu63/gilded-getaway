// alarm.js — the bank's alarm, the meter every screenshot must show.
// Being watched fills the meter; hiding lets it drain. A full meter does not
// end the run at once: it raises the alarm stage (guards hurry, the meter
// restarts part-full) and only the third stage is the arrest. Grabbing the
// floor's prize trips the alarm on purpose — from then on the guards move
// faster and the getaway has to be quick.

export const MAX_STAGE = 3;

export class Alarm {
  constructor() {
    this.meter = 0;      // 0..100
    this.stage = 0;      // 0..MAX_STAGE
    this.tripped = false; // the prize is taken; no going back
  }

  // watched: 0 = unseen, 1 = one pair of eyes, 2 = guard and camera together.
  // careful: the thief is tiptoeing, which halves the fill rate.
  update(dt, watched, careful) {
    if (watched > 0) {
      const rate = (watched >= 2 ? 78 : 46) * (careful ? 0.5 : 1);
      this.meter += rate * dt;
      if (this.meter >= 100) {
        this.meter = 38;
        this.stage += 1;
        return 'stage-up';
      }
    } else {
      this.meter = Math.max(0, this.meter - 16 * dt);
    }
    return null;
  }

  trip() {
    if (this.tripped) return;
    this.tripped = true;
    this.stage = Math.max(this.stage, 1);
    this.meter = Math.max(this.meter, 30);
  }

  get busted() {
    return this.stage >= MAX_STAGE;
  }

  // Guards hurry as the alarm climbs, and hurry most once it has tripped.
  guardSpeedScale() {
    return 1 + this.stage * 0.12 + (this.tripped ? 0.15 : 0);
  }
}
