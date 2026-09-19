/**
 * Web Audio API synthesizer for offline Pomodoro notifications & ambient focus sound.
 * Zero external audio files required — runs 100% offline.
 */

class AudioSynthManager {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private isNoisePlaying = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Play a harmonious double-tone completion bell
   */
  public playCompletionChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.2);

      // Note 2: B5 (987.77 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.18);
      gain2.gain.setValueAtTime(0.35, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 1.8);

      // Note 3: E6 (1318.51 Hz) - high sparkle
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1318.51, now + 0.36);
      gain3.gain.setValueAtTime(0.25, now + 0.36);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.36);
      osc3.stop(now + 2.2);
    } catch (e) {
      console.warn('Audio chime could not be played:', e);
    }
  }

  /**
   * Play a short button click / tick feedback sound
   */
  public playClickTick() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (_) {}
  }

  /**
   * Toggle gentle brown/pink noise for deep focus (synthesized client-side)
   */
  public toggleFocusNoise(enable: boolean, volume = 0.08) {
    try {
      const ctx = this.getContext();

      if (!enable) {
        if (this.gainNode) {
          this.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
          setTimeout(() => {
            if (this.noiseNode) {
              try {
                (this.noiseNode as any).stop?.();
                this.noiseNode.disconnect();
              } catch (_) {}
              this.noiseNode = null;
            }
          }, 300);
        }
        this.isNoisePlaying = false;
        return;
      }

      if (this.isNoisePlaying) return;

      // Generate 5 seconds of pink/brown noise buffer loop
      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise filter
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      // Lowpass filter for smooth rain-like sound
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.4);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseSource.start();

      this.noiseNode = noiseSource;
      this.gainNode = gain;
      this.isNoisePlaying = true;
    } catch (e) {
      console.warn('Focus noise error:', e);
    }
  }

  public getIsNoisePlaying() {
    return this.isNoisePlaying;
  }
}

export const audioSynth = new AudioSynthManager();
