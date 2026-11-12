import { ChamberId } from '../types/aura';
import { CHAMBERS, normalizeChamberId } from './focusEngine';

export const CROSSFADE_DURATION_MS = 700;
export const CROSSFADE_DURATION_SECONDS = 0.7;

export interface SoundscapePresetMeta {
  id: ChamberId;
  name: string;
  shortDescription: string;
  primaryHex: string;
  secondaryHex: string;
}

export const SOUNDSCAPE_PRESETS: SoundscapePresetMeta[] = CHAMBERS.map((c) => ({
  id: c.id,
  name: c.name,
  shortDescription: c.shortDescription,
  primaryHex: c.primaryHex,
  secondaryHex: c.secondaryHex,
}));

// Retained for backward compatibility with existing imports/tests
export const CHAMBER_PRESETS = SOUNDSCAPE_PRESETS;

/**
 * Generates an equal-power crossfade gain curve (`sin(t * PI/2)` for fade-in,
 * `cos(t * PI/2)` for fade-out) scaled by `peakGain`.
 */
export function computeEqualPowerCrossfadeCurve(
  steps = 64,
  direction: 'in' | 'out',
  peakGain = 1.0,
  startGain?: number
): Float32Array {
  const count = Math.max(8, steps);
  const curve = new Float32Array(count);
  const safePeak = Math.max(0.0001, peakGain);

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0..1
    const angle = t * Math.PI * 0.5;
    if (direction === 'in') {
      const base = startGain !== undefined ? startGain : 0;
      curve[i] = base + (safePeak - base) * Math.sin(angle);
    } else {
      const initial = startGain !== undefined ? startGain : safePeak;
      curve[i] = initial * Math.cos(angle);
    }
  }
  return curve;
}

interface ActiveChamberNodes {
  chamberId: ChamberId;
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  cleanupTimeoutId?: number;
}

type NoiseBufferKind = 'pink' | 'brown' | 'ember-crackle';

class AuraSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;

  private activeSlot: ActiveChamberNodes | null = null;
  private fadingOutSlots: Set<ActiveChamberNodes> = new Set();
  private preloadedBuffers: Map<NoiseBufferKind, AudioBuffer> = new Map();

  private desiredPlaying = false;
  private desiredChamberId: ChamberId = 'rain-chamber';
  private desiredVolume = 0.75;
  private autoplayListenerBound = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.9;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.85;
      this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Intelligently preload & cache seamless looping audio buffers immediately
      this.preloadBuffers(this.ctx);
      this.bindAutoplayUnlock();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Will resume automatically on next user gesture via bindAutoplayUnlock
      });
    }
    return this.ctx;
  }

  /**
   * Ensures browser autoplay restrictions are gracefully unlocked on the first
   * pointer or keyboard interaction so audio state stays synchronized with the UI.
   */
  private bindAutoplayUnlock() {
    if (this.autoplayListenerBound || typeof window === 'undefined') return;
    this.autoplayListenerBound = true;

    const unlock = () => {
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended' && this.desiredPlaying) {
        this.ctx.resume().catch(() => {});
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  /**
   * Preloads and caches seamless looping buffers (with 4096-sample equal-power
   * boundary crossfade smoothing so loop points have zero audible clicks or gaps).
   */
  public preload(): void {
    const ctx = this.ensureContext();
    if (ctx) {
      this.preloadBuffers(ctx);
    }
  }

  private preloadBuffers(ctx: AudioContext): void {
    const kinds: NoiseBufferKind[] = ['pink', 'brown', 'ember-crackle'];
    for (const kind of kinds) {
      if (!this.preloadedBuffers.has(kind)) {
        this.preloadedBuffers.set(kind, this.buildSeamlessNoiseBuffer(ctx, kind));
      }
    }
  }

  private getOrBuildBuffer(
    ctx: AudioContext,
    kind: NoiseBufferKind
  ): AudioBuffer {
    const cached = this.preloadedBuffers.get(kind);
    if (cached && cached.sampleRate === ctx.sampleRate) {
      return cached;
    }
    const built = this.buildSeamlessNoiseBuffer(ctx, kind);
    this.preloadedBuffers.set(kind, built);
    return built;
  }

  /**
   * Generates a 6-second stereo AudioBuffer with seamless loop-boundary smoothing
   * so continuous playback never produces a click, pop, or gap at the loop point.
   */
  private buildSeamlessNoiseBuffer(
    ctx: AudioContext,
    type: NoiseBufferKind
  ): AudioBuffer {
    const durationSeconds = 6;
    const length = ctx.sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);

      if (type === 'brown') {
        let lastOut = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.1;
        }
      } else if (type === 'ember-crackle') {
        // Warm hearth bed + organic stochastic micro-pops and wood-ember crackles
        let warmBed = 0;
        let crackleEnv = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          warmBed = (warmBed + 0.024 * white) / 1.024;

          // Sparse organic ember pops
          if (Math.random() < 0.00045) {
            crackleEnv = 0.55 + Math.random() * 0.45;
          }
          crackleEnv *= 0.992;
          const popBurst = white * crackleEnv * 0.68;

          data[i] = warmBed * 2.4 + popBurst;
        }
      } else {
        // Paul Kellet's refined pink noise filter
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        let b3 = 0;
        let b4 = 0;
        let b5 = 0;
        let b6 = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] =
            (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.042;
          b6 = white * 0.115926;
        }
      }

      // Seamless loop boundary crossfade over the final 4096 samples
      const fadeSamples = Math.min(4096, Math.floor(length * 0.05));
      for (let i = 0; i < fadeSamples; i++) {
        const t = i / fadeSamples;
        const tailIdx = length - fadeSamples + i;
        const angle = t * Math.PI * 0.5;
        data[tailIdx] =
          data[tailIdx] * Math.cos(angle) + data[i] * Math.sin(angle);
      }
    }

    return buffer;
  }

  private buildChamberGraph(
    ctx: AudioContext,
    rawChamberId: ChamberId,
    destination: AudioNode,
    initialVolume: number
  ): ActiveChamberNodes {
    const chamberId = normalizeChamberId(rawChamberId);
    const outGain = ctx.createGain();
    outGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    outGain.connect(destination);

    // Smooth 700ms equal-power fade-in curve
    const targetPeak = Math.max(0.0001, initialVolume);
    try {
      const fadeInCurve = computeEqualPowerCrossfadeCurve(
        64,
        'in',
        targetPeak,
        0.0001
      );
      outGain.gain.setValueCurveAtTime(
        fadeInCurve,
        ctx.currentTime,
        CROSSFADE_DURATION_SECONDS
      );
    } catch {
      outGain.gain.exponentialRampToValueAtTime(
        targetPeak,
        ctx.currentTime + CROSSFADE_DURATION_SECONDS
      );
    }

    const sources: AudioScheduledSourceNode[] = [];
    const nodes: AudioNode[] = [outGain];

    if (chamberId === 'rain-chamber') {
      // 1. RAIN CHAMBER — Dual-band architectural skylight rainfall
      const noise = ctx.createBufferSource();
      noise.buffer = this.getOrBuildBuffer(ctx, 'pink');
      noise.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1150;
      bandpass.Q.value = 0.65;

      const highshelf = ctx.createBiquadFilter();
      highshelf.type = 'lowpass';
      highshelf.frequency.value = 3400;

      // Subtle warm acoustic room body
      const warmBody = ctx.createBiquadFilter();
      warmBody.type = 'peaking';
      warmBody.frequency.value = 420;
      warmBody.gain.value = 2.5;

      noise.connect(bandpass);
      bandpass.connect(warmBody);
      warmBody.connect(highshelf);
      highshelf.connect(outGain);
      noise.start();

      sources.push(noise);
      nodes.push(bandpass, warmBody, highshelf);
    } else if (chamberId === 'ocean-drift') {
      // 2. OCEAN DRIFT — Long-period nocturnal swells & deep pelagic surf
      const surfNoise = ctx.createBufferSource();
      surfNoise.buffer = this.getOrBuildBuffer(ctx, 'brown');
      surfNoise.loop = true;

      const surfFilter = ctx.createBiquadFilter();
      surfFilter.type = 'lowpass';
      surfFilter.frequency.value = 340;
      surfFilter.Q.value = 1.15;

      const swellGain = ctx.createGain();
      swellGain.gain.value = 0.62;

      // Primary 9-second tidal wave cycle
      const primaryLfo = ctx.createOscillator();
      primaryLfo.type = 'sine';
      primaryLfo.frequency.value = 0.11;

      const primaryLfoFreqDepth = ctx.createGain();
      primaryLfoFreqDepth.gain.value = 240;

      const primaryLfoAmpDepth = ctx.createGain();
      primaryLfoAmpDepth.gain.value = 0.24;

      primaryLfo.connect(primaryLfoFreqDepth);
      primaryLfoFreqDepth.connect(surfFilter.frequency);

      primaryLfo.connect(primaryLfoAmpDepth);
      primaryLfoAmpDepth.connect(swellGain.gain);

      surfNoise.connect(surfFilter);
      surfFilter.connect(swellGain);
      swellGain.connect(outGain);

      surfNoise.start();
      primaryLfo.start();

      sources.push(surfNoise, primaryLfo);
      nodes.push(
        surfFilter,
        swellGain,
        primaryLfoFreqDepth,
        primaryLfoAmpDepth
      );
    } else if (chamberId === 'forest-echo') {
      // 3. FOREST ECHO — High-altitude cedar wind & nocturnal harmonic resonance
      const canopyWind = ctx.createBufferSource();
      canopyWind.buffer = this.getOrBuildBuffer(ctx, 'pink');
      canopyWind.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 540;
      windFilter.Q.value = 2.4;

      const breezeLfo = ctx.createOscillator();
      breezeLfo.type = 'sine';
      breezeLfo.frequency.value = 0.13;

      const breezeDepth = ctx.createGain();
      breezeDepth.gain.value = 220;

      breezeLfo.connect(breezeDepth);
      breezeDepth.connect(windFilter.frequency);

      const windGain = ctx.createGain();
      windGain.gain.value = 0.68;

      canopyWind.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(outGain);

      // Subtle nocturnal forest resonance (soft harmonic fifth)
      const echoOsc = ctx.createOscillator();
      echoOsc.type = 'sine';
      echoOsc.frequency.value = 396.0;
      const echoGain = ctx.createGain();
      echoGain.gain.value = 0.032;

      echoOsc.connect(echoGain);
      echoGain.connect(outGain);

      canopyWind.start();
      breezeLfo.start();
      echoOsc.start();

      sources.push(canopyWind, breezeLfo, echoOsc);
      nodes.push(windFilter, breezeDepth, windGain, echoGain);
    } else if (chamberId === 'cosmic-silence') {
      // 4. COSMIC SILENCE — Weightless sub-orbital harmonics & deep space horizon
      const spaceDust = ctx.createBufferSource();
      spaceDust.buffer = this.getOrBuildBuffer(ctx, 'brown');
      spaceDust.loop = true;

      const subFilter = ctx.createBiquadFilter();
      subFilter.type = 'lowpass';
      subFilter.frequency.value = 145;

      const dustGain = ctx.createGain();
      dustGain.gain.value = 0.48;

      spaceDust.connect(subFilter);
      subFilter.connect(dustGain);
      dustGain.connect(outGain);
      spaceDust.start();

      // Deep orbital fifth drone (55 Hz A1 + 82.41 Hz E2 + 110 Hz A2)
      const freqs = [55.0, 82.41, 110.0];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 1 ? 'triangle' : 'sine';
        osc.frequency.value = f;

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 240;

        const g = ctx.createGain();
        g.gain.value = idx === 0 ? 0.14 : 0.065;

        osc.connect(lp);
        lp.connect(g);
        g.connect(outGain);
        osc.start();

        sources.push(osc);
        nodes.push(lp, g);
      });

      sources.push(spaceDust);
      nodes.push(subFilter, dustGain);
    } else if (chamberId === 'ember-glow') {
      // 5. EMBER GLOW — Intimate fireplace crackle & warm hearth resonance
      const hearthSource = ctx.createBufferSource();
      hearthSource.buffer = this.getOrBuildBuffer(ctx, 'ember-crackle');
      hearthSource.loop = true;

      const hearthFilter = ctx.createBiquadFilter();
      hearthFilter.type = 'lowpass';
      hearthFilter.frequency.value = 1680;
      hearthFilter.Q.value = 0.7;

      const warmthShelf = ctx.createBiquadFilter();
      warmthShelf.type = 'lowshelf';
      warmthShelf.frequency.value = 260;
      warmthShelf.gain.value = 4.2;

      hearthSource.connect(warmthShelf);
      warmthShelf.connect(hearthFilter);
      hearthFilter.connect(outGain);
      hearthSource.start();

      // Subtle warm acoustic hearth body (146.83 Hz D3 + 220 Hz A3)
      const hearthWarmthOsc = ctx.createOscillator();
      hearthWarmthOsc.type = 'sine';
      hearthWarmthOsc.frequency.value = 146.83;

      const hearthWarmthGain = ctx.createGain();
      hearthWarmthGain.gain.value = 0.045;

      hearthWarmthOsc.connect(hearthWarmthGain);
      hearthWarmthGain.connect(outGain);
      hearthWarmthOsc.start();

      sources.push(hearthSource, hearthWarmthOsc);
      nodes.push(warmthShelf, hearthFilter, hearthWarmthGain);
    } else {
      // 6. CELESTIAL TONE — Soft atmospheric glass-resonator harmonic tones
      const chord = [174.61, 261.63, 329.63, 392.0]; // Fmaj9 glass resonator
      chord.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = f;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 680;

        const voiceGain = ctx.createGain();
        voiceGain.gain.value = 0.075 / (idx * 0.35 + 1);

        // Slow-breathing harmonic shimmer LFO per voice
        const breathLfo = ctx.createOscillator();
        breathLfo.type = 'sine';
        breathLfo.frequency.value = 0.09 + idx * 0.035;

        const breathDepth = ctx.createGain();
        breathDepth.gain.value = 0.024;

        breathLfo.connect(breathDepth);
        breathDepth.connect(voiceGain.gain);

        osc.connect(filter);
        filter.connect(voiceGain);
        voiceGain.connect(outGain);

        osc.start();
        breathLfo.start();

        sources.push(osc, breathLfo);
        nodes.push(filter, voiceGain, breathDepth);
      });
    }

    return { chamberId, gain: outGain, sources, nodes };
  }

  private fadeOutAndStopSlot(slot: ActiveChamberNodes | null) {
    if (!slot || !this.ctx) return;

    this.fadingOutSlots.add(slot);
    const now = this.ctx.currentTime;
    try {
      slot.gain.gain.cancelScheduledValues(now);
      const currentVal = Math.max(0.0001, slot.gain.gain.value);
      const fadeOutCurve = computeEqualPowerCrossfadeCurve(
        64,
        'out',
        currentVal,
        currentVal
      );
      slot.gain.gain.setValueCurveAtTime(
        fadeOutCurve,
        now,
        CROSSFADE_DURATION_SECONDS
      );
    } catch {
      try {
        slot.gain.gain.linearRampToValueAtTime(
          0.0001,
          now + CROSSFADE_DURATION_SECONDS
        );
      } catch {
        // ignore
      }
    }

    slot.cleanupTimeoutId = window.setTimeout(() => {
      slot.sources.forEach((src) => {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // ignore
        }
      });
      slot.nodes.forEach((n) => {
        try {
          n.disconnect();
        } catch {
          // ignore
        }
      });
      this.fadingOutSlots.delete(slot);
    }, CROSSFADE_DURATION_MS + 60);
  }

  /**
   * Synchronizes the active Smart Soundscape with smooth 700ms equal-power
   * crossfades and zero duplicate playback.
   */
  public syncChambers(options: {
    playing: boolean;
    primaryChamberId: ChamberId;
    ambienceVolume: number;
    secondaryChamberId?: ChamberId | null;
    secondaryVolume?: number;
  }) {
    const normalizedId = normalizeChamberId(options.primaryChamberId);
    const safeVolume = Math.max(0, Math.min(1, options.ambienceVolume ?? 0.75));

    this.desiredPlaying = options.playing && safeVolume > 0.001;
    this.desiredChamberId = normalizedId;
    this.desiredVolume = safeVolume;

    if (!this.desiredPlaying) {
      if (this.activeSlot) {
        this.fadeOutAndStopSlot(this.activeSlot);
        this.activeSlot = null;
      }
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (!this.activeSlot || this.activeSlot.chamberId !== normalizedId) {
      // Equal-power 700ms crossfade from outgoing preset to newly selected preset
      if (this.activeSlot) {
        this.fadeOutAndStopSlot(this.activeSlot);
      }
      this.activeSlot = this.buildChamberGraph(
        ctx,
        normalizedId,
        this.masterGain,
        safeVolume
      );
    } else {
      const now = ctx.currentTime;
      try {
        this.activeSlot.gain.gain.cancelScheduledValues(now);
        this.activeSlot.gain.gain.setTargetAtTime(
          Math.max(0.0001, safeVolume),
          now,
          0.14
        );
      } catch {
        // ignore
      }
    }
  }

  /**
   * Returns current playback metadata for testing and UI synchronization.
   */
  public getSoundscapeState(): {
    playing: boolean;
    activeChamberId: ChamberId;
    fadingOutCount: number;
    preloadedBufferCount: number;
    crossfadeDurationMs: number;
  } {
    return {
      playing: this.desiredPlaying,
      activeChamberId: this.desiredChamberId,
      fadingOutCount: this.fadingOutSlots.size,
      preloadedBufferCount: this.preloadedBuffers.size,
      crossfadeDurationMs: CROSSFADE_DURATION_MS,
    };
  }

  /**
   * Plays a gentle, crystalline harmonic chord upon session completion.
   */
  public playCompletionChime(alertVolume = 0.7) {
    if (alertVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66]; // C5, E5, G5, B5, D6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);

      const start = now + idx * 0.16;
      const peak = 0.11 * alertVolume;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 3.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 3.5);
    });
  }

  /**
   * Returns normalized 0..1 audio energy across bass, mid, treble, and overall
   * for real-time Living Lens and Jellyfish synchronization.
   */
  public getAudioBands(): {
    bass: number;
    mid: number;
    treble: number;
    overall: number;
  } {
    if (!this.analyser || !this.freqData || !this.activeSlot) {
      return { bass: 0, mid: 0, treble: 0, overall: 0 };
    }

    this.analyser.getByteFrequencyData(this.freqData);
    const len = this.freqData.length;
    if (len === 0) return { bass: 0, mid: 0, treble: 0, overall: 0 };

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    const bassEnd = Math.floor(len * 0.18);
    const midEnd = Math.floor(len * 0.55);

    for (let i = 0; i < len; i++) {
      const val = this.freqData[i] / 255;
      if (i < bassEnd) bassSum += val;
      else if (i < midEnd) midSum += val;
      else trebleSum += val;
    }

    const bass = Math.min(1, (bassSum / Math.max(1, bassEnd)) * 1.4);
    const mid = Math.min(1, (midSum / Math.max(1, midEnd - bassEnd)) * 1.6);
    const treble = Math.min(
      1,
      (trebleSum / Math.max(1, len - midEnd)) * 2.0
    );
    const overall = Math.min(1, bass * 0.45 + mid * 0.35 + treble * 0.2);

    return { bass, mid, treble, overall };
  }

  /**
   * Returns an array of `barCount` normalized heights (0.12..1.0) for live chamber waveform bars.
   */
  public getFrequencySpectrum(barCount = 12): number[] {
    if (!this.analyser || !this.freqData || !this.activeSlot) {
      return Array.from({ length: barCount }, () => 0.15);
    }

    this.analyser.getByteFrequencyData(this.freqData);
    const step = Math.max(1, Math.floor((this.freqData.length * 0.65) / barCount));
    const bars: number[] = [];

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        const idx = Math.min(this.freqData.length - 1, i * step + j);
        sum += this.freqData[idx];
      }
      const norm = sum / (step * 255);
      bars.push(Math.max(0.15, Math.min(1, norm * 1.65)));
    }

    return bars;
  }
}

export const soundEngine = new AuraSoundEngine();
