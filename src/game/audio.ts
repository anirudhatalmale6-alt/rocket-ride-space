// Lightweight WebAudio synth for game SFX. No assets required.

class AudioSystem {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensure() {
    if (!this.ctx) {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) { this.muted = m; }
  isMuted() { return this.muted; }

  private blip(freq: number, dur: number, type: OscillatorType = "square", vol = 0.15, slide = 0) {
    if (this.muted) return;
    const ctx = this.ensure(); if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  flap()  { this.blip(180, 0.12, "sawtooth", 0.12, 80); }
  score() { this.blip(880, 0.1, "triangle", 0.18); setTimeout(() => this.blip(1320, 0.1, "triangle", 0.15), 70); }
  die()   {
    this.blip(220, 0.2, "sawtooth", 0.2, -160);
    setTimeout(() => this.blip(90, 0.4, "sawtooth", 0.2, -40), 140);
  }
  start() { this.blip(440, 0.1, "triangle", 0.14); setTimeout(() => this.blip(660, 0.1, "triangle", 0.12), 80); }
}

export const audio = new AudioSystem();
