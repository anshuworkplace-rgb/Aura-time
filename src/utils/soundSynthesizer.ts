import { ChamberId } from '../types/aura';

export interface ChamberPreset {
  id: string;
  name: string;
  primaryChamberId: ChamberId;
  secondaryChamberId: ChamberId | null;
  ambienceVolume: number;
  secondaryVolume: number;
}

export const CHAMBER_PRESETS: ChamberPreset[] = [
  {
    id: 'deep-rain-study',
    name: 'Rain + Vinyl Study',
    primaryChamberId: 'rain-chamber',
    secondaryChamberId: 'vinyl-library',
    ambienceVolume: 0.78,
    secondaryVolume: 0.35,
  },
  {
    id: 'orbital-drone',
    name: 'Low Orbit + Soft Drone',
    primaryChamberId: 'low-orbit',
    secondaryChamberId: 'soft-drone',
    ambienceVolume: 0.72,
    secondaryVolume: 0.4,
  },
  {
    id: 'midnight-coast',
    name: 'Coastal + Afterhours',
    primaryChamberId: 'coastal-static',
    secondaryChamberId: 'afterhours-cafe',
    ambienceVolume: 0.75,
    secondaryVolume: 0.32,
  },
  {
    id: 'forest-shield',
    name: 'Forest + Brown Noise',
    primaryChamberId: 'forest-2am',
    secondaryChamberId: 'brown-noise',
    ambienceVolume: 0.74,
    secondaryVolume: 0.3,
  },
];

interface ActiveLayer {
  chamberId: ChamberId;
  gainNode: GainNode;
  cleanup: () => void;
}

class LivingLensSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private primaryLayer: ActiveLayer | null = null;
  private secondaryLayer: ActiveLayer | null = null;
  private isPlaying = false;

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
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.85;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

      this.masterGain.gain.value = 0.0001;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createNoiseBuffer(
    ctx: AudioContext,
    type: 'pink' | 'brown',
    durationSec = 5
  ): AudioBuffer {
    const bufferSize = ctx.sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    if (type === 'pink') {
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] =
          (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;
      }
    } else {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 0.85;
      }
    }
    return buffer;
  }

  private buildChamberLayer(
    ctx: AudioContext,
    destination: AudioNode,
    chamberId: ChamberId,
    initialVolume: number
  ): ActiveLayer {
    const layerGain = ctx.createGain();
    layerGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    layerGain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, initialVolume),
      ctx.currentTime + 0.65
    );
    layerGain.connect(destination);

    const nodesToStop: AudioScheduledSourceNode[] = [];

    const addNoise = (
      noiseType: 'pink' | 'brown',
      filterType: BiquadFilterType,
      freq: number,
      q = 0.7,
      subGain = 0.5
    ) => {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, noiseType, 6);
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = freq;
      filter.Q.value = q;

      const g = ctx.createGain();
      g.gain.value = subGain;

      src.connect(filter);
      filter.connect(g);
      g.connect(layerGain);
      src.start();
      nodesToStop.push(src);
      return { src, filter, gain: g };
    };

    const addDrones = (
      freqs: number[],
      wave: OscillatorType = 'sine',
      subGain = 0.14
    ) => {
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = wave;
        osc.frequency.value = f;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = f * 2.4;

        const g = ctx.createGain();
        g.gain.value = subGain / freqs.length;

        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.07 + idx * 0.025;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = g.gain.value * 0.35;
        lfo.connect(lfoGain);
        lfoGain.connect(g.gain);

        osc.connect(filter);
        filter.connect(g);
        g.connect(layerGain);

        osc.start();
        lfo.start();
        nodesToStop.push(osc, lfo);
      });
    };

    switch (chamberId) {
      case 'rain-chamber':
        addNoise('pink', 'bandpass', 920, 0.85, 0.52);
        addNoise('brown', 'lowpass', 280, 0.55, 0.42);
        break;
      case 'low-orbit':
        addNoise('brown', 'lowpass', 145, 1.1, 0.68);
        addDrones([55.0, 82.41, 110.0], 'sine', 0.18);
        break;
      case 'vinyl-library':
        // Procedural analog room tone & warm surface dust ambience
        addNoise('pink', 'bandpass', 1550, 1.4, 0.22);
        addNoise('brown', 'lowpass', 230, 0.6, 0.36);
        break;
      case 'afterhours-cafe':
        addNoise('brown', 'bandpass', 360, 0.7, 0.38);
        addDrones([174.61, 220.0, 261.63, 329.63], 'triangle', 0.2);
        break;
      case 'coastal-static': {
        const wave = addNoise('brown', 'lowpass', 260, 0.8, 0.62);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.1;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 150;
        lfo.connect(lfoGain);
        lfoGain.connect(wave.filter.frequency);
        lfo.start();
        nodesToStop.push(lfo);
        break;
      }
      case 'forest-2am':
        addNoise('pink', 'bandpass', 540, 1.35, 0.44);
        addDrones([146.83, 220.0], 'sine', 0.07);
        break;
      case 'brown-noise':
        addNoise('brown', 'lowpass', 310, 0.6, 0.78);
        break;
      case 'soft-drone':
        addDrones([130.81, 196.0, 246.94, 293.66], 'sine', 0.28);
        break;
      case 'deep-quiet':
        break;
    }

    return {
      chamberId,
      gainNode: layerGain,
      cleanup: () => {
        const now = ctx.currentTime;
        try {
          layerGain.gain.cancelScheduledValues(now);
          layerGain.gain.setValueAtTime(
            Math.max(0.0001, layerGain.gain.value),
            now
          );
          layerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        } catch {
          // ignore
        }
        window.setTimeout(() => {
          nodesToStop.forEach((n) => {
            try {
              n.stop();
              n.disconnect();
            } catch {
              // ignore
            }
          });
          try {
            layerGain.disconnect();
          } catch {
            // ignore
          }
        }, 350);
      },
    };
  }

  public syncChambers(params: {
    playing: boolean;
    primaryChamberId: ChamberId;
    ambienceVolume: number;
    secondaryChamberId: ChamberId | null;
    secondaryVolume: number;
  }): void {
    const shouldPlay =
      params.playing &&
      params.ambienceVolume > 0 &&
      (params.primaryChamberId !== 'deep-quiet' ||
        (params.secondaryChamberId !== null &&
          params.secondaryChamberId !== 'deep-quiet'));

    if (!shouldPlay) {
      this.stopAll();
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    this.isPlaying = true;
    this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
    this.masterGain.gain.setTargetAtTime(
      Math.max(0.0001, params.ambienceVolume),
      ctx.currentTime,
      0.28
    );

    if (params.primaryChamberId !== 'deep-quiet') {
      if (
        !this.primaryLayer ||
        this.primaryLayer.chamberId !== params.primaryChamberId
      ) {
        if (this.primaryLayer) this.primaryLayer.cleanup();
        this.primaryLayer = this.buildChamberLayer(
          ctx,
          this.masterGain,
          params.primaryChamberId,
          0.82
        );
      }
    } else if (this.primaryLayer) {
      this.primaryLayer.cleanup();
      this.primaryLayer = null;
    }

    if (
      params.secondaryChamberId &&
      params.secondaryChamberId !== 'deep-quiet'
    ) {
      if (
        !this.secondaryLayer ||
        this.secondaryLayer.chamberId !== params.secondaryChamberId
      ) {
        if (this.secondaryLayer) this.secondaryLayer.cleanup();
        this.secondaryLayer = this.buildChamberLayer(
          ctx,
          this.masterGain,
          params.secondaryChamberId,
          params.secondaryVolume
        );
      } else {
        this.secondaryLayer.gainNode.gain.setTargetAtTime(
          Math.max(0.0001, params.secondaryVolume),
          ctx.currentTime,
          0.18
        );
      }
    } else if (this.secondaryLayer) {
      this.secondaryLayer.cleanup();
      this.secondaryLayer = null;
    }
  }

  public stopAll(): void {
    this.isPlaying = false;
    if (this.primaryLayer) {
      this.primaryLayer.cleanup();
      this.primaryLayer = null;
    }
    if (this.secondaryLayer) {
      this.secondaryLayer.cleanup();
      this.secondaryLayer = null;
    }
    if (this.ctx && this.masterGain) {
      try {
        this.masterGain.gain.setTargetAtTime(
          0.0001,
          this.ctx.currentTime,
          0.22
        );
      } catch {
        // ignore
      }
    }
  }

  public getAudioAmplitude(): number {
    if (!this.isPlaying || !this.analyser || !this.freqData) {
      return 0;
    }
    this.analyser.getByteFrequencyData(this.freqData);
    let sum = 0;
    const bins = Math.min(32, this.freqData.length);
    for (let i = 0; i < bins; i++) {
      sum += this.freqData[i];
    }
    return Math.min(1, sum / (bins * 175));
  }

  public getAudioBands(): {
    bass: number;
    mid: number;
    treble: number;
    overall: number;
  } {
    if (!this.isPlaying || !this.analyser || !this.freqData) {
      return { bass: 0, mid: 0, treble: 0, overall: 0 };
    }
    this.analyser.getByteFrequencyData(this.freqData);
    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    for (let i = 0; i < 8; i++) bassSum += this.freqData[i] || 0;
    for (let i = 8; i < 20; i++) midSum += this.freqData[i] || 0;
    for (let i = 20; i < 36; i++) trebleSum += this.freqData[i] || 0;

    const bass = Math.min(1, bassSum / (8 * 190));
    const mid = Math.min(1, midSum / (12 * 165));
    const treble = Math.min(1, trebleSum / (16 * 140));
    const overall = Math.min(1, bass * 0.45 + mid * 0.35 + treble * 0.2);

    return { bass, mid, treble, overall };
  }

  public getFrequencySpectrum(bandCount = 8): number[] {
    if (!this.isPlaying || !this.analyser || !this.freqData) {
      return Array.from({ length: bandCount }, () => 0.12);
    }
    this.analyser.getByteFrequencyData(this.freqData);
    const usableBins = Math.min(32, this.freqData.length);
    const step = Math.max(1, Math.floor(usableBins / bandCount));
    const result: number[] = [];

    for (let b = 0; b < bandCount; b++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += this.freqData[b * step + j] || 0;
      }
      const norm = sum / (step * 210);
      result.push(Math.max(0.14, Math.min(1, norm)));
    }
    return result;
  }

  public playCompletionChime(alertVolume = 0.7): void {
    if (alertVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [261.63, 329.63, 392.0, 493.88, 587.33]; // Cmaj9 liquid glass bloom
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.085);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.085);
      gain.gain.linearRampToValueAtTime(
        alertVolume * 0.075,
        now + idx * 0.085 + 0.14
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.085 + 2.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.085);
      osc.stop(now + idx * 0.085 + 2.9);
    });
  }
}

export const soundEngine = new LivingLensSoundEngine();
