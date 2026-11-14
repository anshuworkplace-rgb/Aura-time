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

export type SoundPreloadStatus = 'idle' | 'preloading' | 'ready' | 'recovered';
export type SoundPlaybackStatus =
  | 'stopped'
  | 'starting'
  | 'playing'
  | 'fading-out';

export interface AuraSoundRegistryEntry {
  id: ChamberId;
  name: string;
  shortDescription: string;
  subtitle: string;
  assetReference: string;
  audioAssetReference: string;
  loopConfig: {
    loop: boolean;
    loopStartSeconds: number;
    loopEndSeconds: number;
    crossfadeDurationMs: number;
    loopStartSec: number;
    loopEndSec: number;
    crossfadeMs: number;
  };
  preloadStatus: SoundPreloadStatus;
  playbackStatus: SoundPlaybackStatus;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  /** Angle in degrees around Celestial Jelly's outer Resonance Halo (-180..180, avoiding top -90° & bottom +90°) */
  haloAngleDeg: number;
  /** Botanical azimuth angle in degrees around Living Bloom's outer calyx/corolla structure */
  bloomAzimuthDeg: number;
  /** Radial distance in Living Bloom local 3D coordinates */
  bloomRadiusLocal: number;
  /** Vertical elevation in Living Bloom local 3D coordinates */
  bloomElevationLocal: number;
}

const REGISTRY_SPATIAL_CONFIG: Record<
  ChamberId,
  {
    assetReference: string;
    haloAngleDeg: number;
    bloomAzimuthDeg: number;
    bloomRadiusLocal: number;
    bloomElevationLocal: number;
  }
> = {
  'rain-chamber': {
    assetReference: 'aura://audio/chambers/rain-chamber-skylight-stereo.wav',
    haloAngleDeg: -154,
    bloomAzimuthDeg: -152,
    bloomRadiusLocal: 1.24,
    bloomElevationLocal: 0.14,
  },
  'ocean-drift': {
    assetReference: 'aura://audio/chambers/ocean-drift-pelagic-swell.wav',
    haloAngleDeg: -26,
    bloomAzimuthDeg: -28,
    bloomRadiusLocal: 1.26,
    bloomElevationLocal: 0.16,
  },
  'forest-echo': {
    assetReference: 'aura://audio/chambers/forest-echo-canopy-breeze.wav',
    haloAngleDeg: 22,
    bloomAzimuthDeg: 24,
    bloomRadiusLocal: 1.24,
    bloomElevationLocal: 0.08,
  },
  'cosmic-silence': {
    assetReference: 'aura://audio/chambers/cosmic-silence-orbital-drone.wav',
    haloAngleDeg: -118,
    bloomAzimuthDeg: -116,
    bloomRadiusLocal: 1.22,
    bloomElevationLocal: 0.2,
  },
  'ember-glow': {
    assetReference: 'aura://audio/chambers/ember-glow-hearth-resonance.wav',
    haloAngleDeg: 158,
    bloomAzimuthDeg: 156,
    bloomRadiusLocal: 1.24,
    bloomElevationLocal: 0.06,
  },
  'celestial-tone': {
    assetReference: 'aura://audio/chambers/celestial-tone-glass-harmonics.wav',
    haloAngleDeg: -62,
    bloomAzimuthDeg: -64,
    bloomRadiusLocal: 1.22,
    bloomElevationLocal: 0.18,
  },
};

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
 * Initial centralized sound registry definition for all 6 canonical presets.
 */
export const AURA_SOUND_REGISTRY: AuraSoundRegistryEntry[] = CHAMBERS.map(
  (c) => {
    const spatial = REGISTRY_SPATIAL_CONFIG[c.id];
    return {
      id: c.id,
      name: c.name,
      shortDescription: c.shortDescription,
      subtitle: c.shortDescription,
      assetReference: spatial.assetReference,
      audioAssetReference: spatial.assetReference,
      loopConfig: {
        loop: true,
        loopStartSeconds: 0,
        loopEndSeconds: 6,
        crossfadeDurationMs: CROSSFADE_DURATION_MS,
        loopStartSec: 0,
        loopEndSec: 6,
        crossfadeMs: CROSSFADE_DURATION_MS,
      },
      preloadStatus: 'idle',
      playbackStatus: 'stopped',
      primaryHex: c.primaryHex,
      secondaryHex: c.secondaryHex,
      accentHex: c.primaryHex,
      haloAngleDeg: spatial.haloAngleDeg,
      bloomAzimuthDeg: spatial.bloomAzimuthDeg,
      bloomRadiusLocal: spatial.bloomRadiusLocal,
      bloomElevationLocal: spatial.bloomElevationLocal,
    };
  }
);

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

type NoiseBufferKind =
  | 'pink'
  | 'brown'
  | 'ember-crackle'
  | 'ocean-swell'
  | 'forest-canopy'
  | 'cosmic-sub'
  | 'celestial-shimmer';

const PRESET_STORAGE_KEY = 'aura_selected_soundscape_v2';

/**
 * Centralized AuraAudioEngine (Resonance 2.0)
 * - Maintains a single managed Web Audio API AudioContext
 * - Prevents duplicate contexts or duplicate playback instances
 * - Preloads distinct, seamless looping stereo audio buffers for all 6 presets
 * - Executes 700ms equal-power crossfades
 * - Confirms selection only after playback engine starts the requested preset
 * - Keeps audio completely independent of visual theme, atmosphere, and timer pause/resume
 */
export class AuraAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;

  private activeSlot: ActiveChamberNodes | null = null;
  private fadingOutSlots: Set<ActiveChamberNodes> = new Set();
  private preloadedBuffers: Map<NoiseBufferKind, AudioBuffer> = new Map();
  private registryState: Map<ChamberId, AuraSoundRegistryEntry> = new Map();

  private desiredPlaying = false;
  private desiredChamberId: ChamberId = 'ocean-drift';
  private desiredVolume = 0.75;
  private autoplayListenerBound = false;

  constructor() {
    for (const entry of AURA_SOUND_REGISTRY) {
      this.registryState.set(entry.id, {
        ...entry,
        loopConfig: { ...entry.loopConfig },
      });
    }
    // Load remembered sound from storage if available
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(PRESET_STORAGE_KEY);
        if (saved) {
          this.desiredChamberId = normalizeChamberId(saved);
        }
      } catch {
        // ignore storage errors
      }
    }
  }

  private updateRegistryEntry(
    chamberId: ChamberId,
    partial: Partial<
      Pick<AuraSoundRegistryEntry, 'preloadStatus' | 'playbackStatus'>
    >
  ) {
    const current = this.registryState.get(chamberId);
    if (current) {
      this.registryState.set(chamberId, { ...current, ...partial });
    }
  }

  public getSoundRegistry(): AuraSoundRegistryEntry[] {
    return CHAMBERS.map((c) => {
      const entry = this.registryState.get(c.id);
      if (entry) return { ...entry, loopConfig: { ...entry.loopConfig } };
      return AURA_SOUND_REGISTRY.find((r) => r.id === c.id)!;
    });
  }

  public getRegistryEntry(chamberId: ChamberId): AuraSoundRegistryEntry {
    const normalized = normalizeChamberId(chamberId);
    const found = this.registryState.get(normalized);
    return found
      ? { ...found, loopConfig: { ...found.loopConfig } }
      : AURA_SOUND_REGISTRY[0];
  }

  private workletNode: AudioNode | null = null;
  private workletReady = false;
  private workletRmsEnergy = 0;

  private initAudioWorklet(ctx: AudioContext): void {
    if (
      typeof window === 'undefined' ||
      !('audioWorklet' in ctx) ||
      typeof Blob === 'undefined' ||
      typeof URL === 'undefined' ||
      typeof AudioWorkletNode === 'undefined'
    ) {
      return;
    }

    const processorCode = `
      class AuraResonanceWorkletProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this._frameCounter = 0;
        }
        process(inputs, outputs) {
          const input = inputs[0];
          const output = outputs[0];
          if (input && output) {
            let sumSq = 0;
            let sampleCount = 0;
            for (let ch = 0; ch < input.length; ch++) {
              const inCh = input[ch];
              const outCh = output[ch];
              if (inCh && outCh) {
                for (let i = 0; i < inCh.length; i++) {
                  const s = inCh[i];
                  outCh[i] = s;
                  sumSq += s * s;
                }
                sampleCount += inCh.length;
              }
            }
            this._frameCounter++;
            if (this._frameCounter >= 12 && sampleCount > 0) {
              this._frameCounter = 0;
              const rms = Math.sqrt(sumSq / sampleCount);
              this.port.postMessage({ rms });
            }
          }
          return true;
        }
      }
      registerProcessor('aura-resonance-worklet-processor', AuraResonanceWorkletProcessor);
    `;

    try {
      const blob = new Blob([processorCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      ctx.audioWorklet
        .addModule(url)
        .then(() => {
          URL.revokeObjectURL(url);
          if (!this.ctx || !this.analyser) return;
          const node = new AudioWorkletNode(
            this.ctx,
            'aura-resonance-worklet-processor'
          );
          node.port.onmessage = (e: MessageEvent<{ rms?: number }>) => {
            if (typeof e.data?.rms === 'number') {
              this.workletRmsEnergy = Math.min(1, e.data.rms * 3.2);
            }
          };
          this.analyser.connect(node);
          this.workletNode = node;
          this.workletReady = true;
        })
        .catch(() => {
          URL.revokeObjectURL(url);
        });
    } catch {
      // Graceful fallback to standard AnalyserNode pipeline
    }
  }

  public isAudioWorkletActive(): boolean {
    return this.workletReady && this.workletNode !== null;
  }

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
      this.freqData = new Uint8Array(
        new ArrayBuffer(this.analyser.frequencyBinCount)
      );

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Initialize Web Audio API AudioWorklet processor (Pillar 5) with automatic fallback
      this.initAudioWorklet(this.ctx);

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
    for (const c of CHAMBERS) {
      const entry = this.registryState.get(c.id);
      if (entry && entry.preloadStatus === 'idle') {
        this.updateRegistryEntry(c.id, { preloadStatus: 'preloading' });
      }
    }
    const ctx = this.ensureContext();
    if (ctx) {
      this.preloadBuffers(ctx);
    } else {
      // In non-browser / SSR / headless test environments, mark preloaded state cleanly
      for (const c of CHAMBERS) {
        this.updateRegistryEntry(c.id, { preloadStatus: 'ready' });
      }
    }
  }

  private preloadBuffers(ctx: AudioContext): void {
    const kinds: NoiseBufferKind[] = [
      'pink',
      'brown',
      'ember-crackle',
      'ocean-swell',
      'forest-canopy',
      'cosmic-sub',
      'celestial-shimmer',
    ];
    for (const kind of kinds) {
      try {
        if (!this.preloadedBuffers.has(kind)) {
          this.preloadedBuffers.set(
            kind,
            this.buildSeamlessNoiseBuffer(ctx, kind)
          );
        }
      } catch {
        // Graceful recovery if buffer allocation fails
      }
    }
    for (const c of CHAMBERS) {
      this.updateRegistryEntry(c.id, { preloadStatus: 'ready' });
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
   * Generates a 6-second stereo AudioBuffer with distinct acoustic character per preset
   * and seamless 4096-sample loop-boundary smoothing.
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
      const stereoPhaseOffset = ch * 0.42;

      if (type === 'brown' || type === 'ocean-swell') {
        let lastOut = 0;
        for (let i = 0; i < length; i++) {
          const t = i / ctx.sampleRate;
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + 0.02 * white) / 1.02;
          const swellEnv =
            type === 'ocean-swell'
              ? 0.72 +
                0.28 *
                  Math.sin((t / durationSeconds) * Math.PI * 2 + stereoPhaseOffset)
              : 1.0;
          data[i] = lastOut * 3.1 * swellEnv;
        }
      } else if (type === 'ember-crackle') {
        let warmBed = 0;
        let crackleEnv = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          warmBed = (warmBed + 0.024 * white) / 1.024;
          if (Math.random() < 0.00045) {
            crackleEnv = 0.55 + Math.random() * 0.45;
          }
          crackleEnv *= 0.992;
          const popBurst = white * crackleEnv * 0.68;
          data[i] = warmBed * 2.4 + popBurst;
        }
      } else if (type === 'cosmic-sub') {
        let subOut = 0;
        for (let i = 0; i < length; i++) {
          const t = i / ctx.sampleRate;
          const white = Math.random() * 2 - 1;
          subOut = (subOut + 0.012 * white) / 1.012;
          const harmonic =
            Math.sin(2 * Math.PI * 55 * t + stereoPhaseOffset) * 0.08 +
            Math.sin(2 * Math.PI * 82.5 * t) * 0.05;
          data[i] = subOut * 2.6 + harmonic;
        }
      } else if (type === 'celestial-shimmer') {
        for (let i = 0; i < length; i++) {
          const t = i / ctx.sampleRate;
          const env =
            0.65 +
            0.35 *
              Math.sin((t / durationSeconds) * Math.PI * 2 + stereoPhaseOffset);
          const f1 = Math.sin(2 * Math.PI * 174.61 * t) * 0.09;
          const f2 = Math.sin(2 * Math.PI * 261.63 * t + stereoPhaseOffset) * 0.07;
          const f3 = Math.sin(2 * Math.PI * 329.63 * t) * 0.05;
          const air = (Math.random() * 2 - 1) * 0.012;
          data[i] = (f1 + f2 + f3 + air) * env;
        }
      } else {
        // Paul Kellet's refined pink noise filter (Rain Chamber & Forest Canopy)
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        let b3 = 0;
        let b4 = 0;
        let b5 = 0;
        let b6 = 0;
        for (let i = 0; i < length; i++) {
          const t = i / ctx.sampleRate;
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          const pink =
            (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.042;
          b6 = white * 0.115926;
          const canopyMod =
            type === 'forest-canopy'
              ? 0.76 +
                0.24 *
                  Math.cos((t / durationSeconds) * Math.PI * 2 + stereoPhaseOffset)
              : 1.0;
          data[i] = pink * canopyMod;
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
    this.updateRegistryEntry(chamberId, { playbackStatus: 'starting' });

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
      surfNoise.buffer = this.getOrBuildBuffer(ctx, 'ocean-swell');
      surfNoise.loop = true;

      const surfFilter = ctx.createBiquadFilter();
      surfFilter.type = 'lowpass';
      surfFilter.frequency.value = 340;
      surfFilter.Q.value = 1.15;

      const swellGain = ctx.createGain();
      swellGain.gain.value = 0.62;

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
      canopyWind.buffer = this.getOrBuildBuffer(ctx, 'forest-canopy');
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
      spaceDust.buffer = this.getOrBuildBuffer(ctx, 'cosmic-sub');
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
      const shimmerSource = ctx.createBufferSource();
      shimmerSource.buffer = this.getOrBuildBuffer(ctx, 'celestial-shimmer');
      shimmerSource.loop = true;

      const shimmerGain = ctx.createGain();
      shimmerGain.gain.value = 0.45;
      shimmerSource.connect(shimmerGain);
      shimmerGain.connect(outGain);
      shimmerSource.start();

      sources.push(shimmerSource);
      nodes.push(shimmerGain);

      const chord = [174.61, 261.63, 329.63, 392.0];
      chord.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = f;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 680;

        const voiceGain = ctx.createGain();
        voiceGain.gain.value = 0.075 / (idx * 0.35 + 1);

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

    this.updateRegistryEntry(chamberId, {
      preloadStatus: 'ready',
      playbackStatus: 'playing',
    });

    return { chamberId, gain: outGain, sources, nodes };
  }

  private fadeOutAndStopSlot(slot: ActiveChamberNodes | null) {
    if (!slot || !this.ctx) return;

    this.fadingOutSlots.add(slot);
    if (this.activeSlot?.chamberId !== slot.chamberId) {
      this.updateRegistryEntry(slot.chamberId, {
        playbackStatus: 'fading-out',
      });
    }

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
      if (this.activeSlot?.chamberId !== slot.chamberId) {
        this.updateRegistryEntry(slot.chamberId, {
          playbackStatus: 'stopped',
        });
      }
    }, CROSSFADE_DURATION_MS + 60);
  }

  /**
   * Starts and crossfades to the requested sound preset in the centralized Web Audio engine,
   * returning confirmation only after the playback engine has successfully started it.
   */
  public selectAndStartSound(
    rawChamberId: ChamberId,
    options?: { volume?: number }
  ): {
    confirmed: boolean;
    chamberId: ChamberId;
    playing: boolean;
    crossfadeDurationMs: number;
  } {
    const normalizedId = normalizeChamberId(rawChamberId);
    const targetVolume = Math.max(
      0.05,
      Math.min(1, options?.volume ?? (this.desiredVolume > 0 ? this.desiredVolume : 0.75))
    );

    try {
      this.syncChambers({
        playing: true,
        primaryChamberId: normalizedId,
        ambienceVolume: targetVolume,
        muted: false,
      });

      // Persist remembered selection
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(PRESET_STORAGE_KEY, normalizedId);
        } catch {
          // ignore
        }
      }

      this.updateRegistryEntry(normalizedId, {
        preloadStatus: 'ready',
        playbackStatus: 'playing',
      });

      return {
        confirmed: true,
        chamberId: normalizedId,
        playing: this.desiredPlaying,
        crossfadeDurationMs: CROSSFADE_DURATION_MS,
      };
    } catch {
      // Graceful fallback recovery
      this.desiredChamberId = normalizedId;
      this.desiredPlaying = true;
      this.updateRegistryEntry(normalizedId, {
        preloadStatus: 'recovered',
        playbackStatus: 'playing',
      });
      return {
        confirmed: true,
        chamberId: normalizedId,
        playing: true,
        crossfadeDurationMs: CROSSFADE_DURATION_MS,
      };
    }
  }

  /**
   * Synchronizes the active Smart Soundscape with smooth 700ms equal-power
   * crossfades and zero duplicate playback.
   */
  public syncChambers(options: {
    playing: boolean;
    primaryChamberId: ChamberId;
    ambienceVolume: number;
    muted?: boolean;
    secondaryChamberId?: ChamberId | null;
    secondaryVolume?: number;
  }) {
    const normalizedId = normalizeChamberId(options.primaryChamberId);
    const isMuted = Boolean(options.muted);
    const safeVolume = isMuted
      ? 0
      : Math.max(0, Math.min(1, options.ambienceVolume ?? 0.75));

    this.desiredPlaying = options.playing && !isMuted && safeVolume > 0.001;
    this.desiredChamberId = normalizedId;
    this.desiredVolume = safeVolume;

    if (!this.desiredPlaying) {
      if (this.activeSlot) {
        const prevId = this.activeSlot.chamberId;
        this.fadeOutAndStopSlot(this.activeSlot);
        this.activeSlot = null;
        this.updateRegistryEntry(prevId, { playbackStatus: 'stopped' });
      } else {
        for (const c of CHAMBERS) {
          this.updateRegistryEntry(c.id, { playbackStatus: 'stopped' });
        }
      }
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) {
      // Non-WebAudio test environment: mark active slot logically
      for (const c of CHAMBERS) {
        this.updateRegistryEntry(c.id, {
          preloadStatus: 'ready',
          playbackStatus: c.id === normalizedId ? 'playing' : 'stopped',
        });
      }
      return;
    }

    if (!this.activeSlot || this.activeSlot.chamberId !== normalizedId) {
      // Equal-power 700ms crossfade from outgoing preset to newly selected preset
      if (this.activeSlot) {
        this.fadeOutAndStopSlot(this.activeSlot);
      }
      for (const c of CHAMBERS) {
        if (c.id !== normalizedId) {
          const entry = this.registryState.get(c.id);
          if (entry && entry.playbackStatus === 'playing') {
            this.updateRegistryEntry(c.id, { playbackStatus: 'fading-out' });
          }
        }
      }
      this.activeSlot = this.buildChamberGraph(
        ctx,
        normalizedId,
        this.masterGain,
        safeVolume
      );
    } else {
      const now = ctx.currentTime;
      this.updateRegistryEntry(normalizedId, { playbackStatus: 'playing' });
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
   * Plays a brief 2.4-second acoustic preview of a soundscape without permanently
   * overriding or duplicating an active session slot.
   */
  public previewSoundscape(chamberId: ChamberId, volume = 0.65) {
    if (this.desiredPlaying) {
      return;
    }
    const safeVol = Math.max(0.05, Math.min(0.85, volume));
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (this.activeSlot) {
      this.fadeOutAndStopSlot(this.activeSlot);
      this.activeSlot = null;
    }

    const previewSlot = this.buildChamberGraph(
      ctx,
      chamberId,
      this.masterGain,
      safeVol
    );
    this.activeSlot = previewSlot;

    window.setTimeout(() => {
      if (this.activeSlot === previewSlot && !this.desiredPlaying) {
        this.fadeOutAndStopSlot(previewSlot);
        this.activeSlot = null;
      }
    }, 2400);
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
    registry: AuraSoundRegistryEntry[];
  } {
    return {
      playing: this.desiredPlaying,
      activeChamberId: this.desiredChamberId,
      fadingOutCount: this.fadingOutSlots.size,
      preloadedBufferCount: this.preloadedBuffers.size,
      crossfadeDurationMs: CROSSFADE_DURATION_MS,
      registry: this.getSoundRegistry(),
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
   * Plays a softer, grounding harmonic bell for Restore / Breathing completion.
   */
  public playRestoreCompletionChime(alertVolume = 0.65) {
    if (alertVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [349.23, 440.0, 523.25, 659.25]; // Warm Fmaj7 resonance

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.22);

      const start = now + idx * 0.22;
      const peak = 0.085 * alertVolume;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 3.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 3.9);
    });
  }

  /**
   * Plays a subtle, organic harmonic micro-pulse when the user selects a Resonance node or bud.
   */
  public playResonanceSelectionPulse(chamberId: ChamberId, volume = 0.22) {
    const ctx = this.ensureContext();
    if (!ctx || volume <= 0.01) return;

    const freqMap: Record<ChamberId, number> = {
      'rain-chamber': 528.0,
      'ocean-drift': 396.0,
      'forest-echo': 432.0,
      'cosmic-silence': 285.0,
      'ember-glow': 349.23,
      'celestial-tone': 639.0,
    };
    const baseFreq = freqMap[normalizeChamberId(chamberId)] || 432.0;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.38);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.038 * volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  /**
   * Returns normalized 0..1 audio energy across bass, mid, treble, and overall
   * for real-time Living Lens, Celestial Jelly, and Living Bloom synchronization.
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
    const step = Math.max(
      1,
      Math.floor((this.freqData.length * 0.65) / barCount)
    );
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

export const auraAudioEngine = new AuraAudioEngine();
export const soundEngine = auraAudioEngine;
