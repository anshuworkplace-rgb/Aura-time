import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  FocusSceneConfig,
  OrbDesignId,
  TimerPhase,
  TimerStatus,
} from '../types/aura';
import { soundEngine } from '../utils/soundSynthesizer';
import {
  NEBULA_FLUID_FRAGMENT_SHADER,
  NEBULA_FLUID_VERTEX_SHADER,
  QUANTUM_PARTICLES_FRAGMENT_SHADER,
  QUANTUM_PARTICLES_VERTEX_SHADER,
  computeBackgroundMixWeights,
  orbDesignToShaderMode,
} from '../utils/quantumNebulaShaders';
import {
  GPUFluidSimulationPipeline,
  INFINITY_AURORA_WGSL_SOURCE,
  computeAdaptiveQualityTier,
  computeSceneAuroraPalette,
  computeTimerAwareAtmosphereState,
  createNeutralFluidDataTexture,
} from '../utils/infinityAuroraEngine';
import { CelestialJelly3DSceneController } from './CelestialJelly3DScene';
import { LivingBloom3DSceneController } from './LivingBloom3DScene';

interface QuantumNebulaBackgroundProps {
  scene: FocusSceneConfig;
  orbDesign?: OrbDesignId;
  status: TimerStatus;
  phase?: TimerPhase;
  remainingSeconds?: number;
  totalSeconds?: number;
  progress: number;
  audioReactive: boolean;
  reducedMotion: boolean;
  backgroundMix?: number;
}

// Pre-allocated module-scope helpers for zero GC in the 60fps animation loop
const _targetViolet = new THREE.Color();
const _targetCyan = new THREE.Color();
const _targetMagenta = new THREE.Color();
const _targetDeep = new THREE.Color();
const _targetZenith = new THREE.Color();
const _targetEngineBPrimary = new THREE.Color();
const _targetEngineBCoral = new THREE.Color();

export const QuantumNebulaBackground: React.FC<QuantumNebulaBackgroundProps> = ({
  scene,
  orbDesign = 'original',
  status,
  phase = 'focus',
  remainingSeconds = 2700,
  totalSeconds = 2700,
  progress,
  audioReactive,
  reducedMotion,
  backgroundMix = 0.52,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  // Track session state transition timestamps for timer-aware visual behavior
  const sessionStartMsRef = useRef<number>(-10000);
  const sessionCompleteMsRef = useRef<number>(-10000);
  const prevStatusRef = useRef<TimerStatus>(status);

  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev !== 'running' && status === 'running') {
      sessionStartMsRef.current = performance.now();
    }
    if (prev !== 'completed' && status === 'completed') {
      sessionCompleteMsRef.current = performance.now();
    }
    prevStatusRef.current = status;
  }, [status]);

  const liveStateRef = useRef({
    scene,
    orbDesign,
    status,
    phase,
    remainingSeconds,
    totalSeconds,
    progress,
    audioReactive,
    reducedMotion,
    backgroundMix,
  });

  useEffect(() => {
    liveStateRef.current = {
      scene,
      orbDesign,
      status,
      phase,
      remainingSeconds,
      totalSeconds,
      progress,
      audioReactive,
      reducedMotion,
      backgroundMix,
    };
  }, [
    scene,
    orbDesign,
    status,
    phase,
    remainingSeconds,
    totalSeconds,
    progress,
    audioReactive,
    reducedMotion,
    backgroundMix,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let fluidPipeline: GPUFluidSimulationPipeline | null = null;
    let neutralFluidTex: THREE.DataTexture | null = null;
    let webgpuDevice: { destroy?: () => void } | null = null;

    try {
      // 1. Software-WebGL Guard (Three.js r160+ standard)
      const isSoftwareGl = (() => {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      })();

      // Optional WebGPU WGSL Compute Verification & Device Loss Guard (when supported on hardware GPU)
      if (
        !isSoftwareGl &&
        typeof navigator !== 'undefined' &&
        'gpu' in navigator
      ) {
        const navGpu = (
          navigator as unknown as {
            gpu?: {
              requestAdapter?: () => Promise<{
                requestDevice?: () => Promise<{
                  createShaderModule?: (desc: { code: string }) => unknown;
                  lost?: Promise<unknown>;
                  destroy?: () => void;
                }>;
              } | null>;
            };
          }
        ).gpu;

        navGpu
          ?.requestAdapter?.()
          .then((adapter) => adapter?.requestDevice?.())
          .then((device) => {
            if (!device) return;
            webgpuDevice = device;
            device.createShaderModule?.({ code: INFINITY_AURORA_WGSL_SOURCE });
            device.lost?.then(() => {
              webgpuDevice = null;
            });
          })
          .catch(() => {
            // Gracefully continue with WebGL2 pipeline
          });
      }

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      const initialQuality = computeAdaptiveQualityTier(
        60,
        isSoftwareGl,
        liveStateRef.current.reducedMotion
      );
      const pixelRatio = isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio || 1, initialQuality.pixelRatioCap);

      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.06;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.appendChild(renderer.domElement);

      const threeScene = new THREE.Scene();
      threeScene.background = new THREE.Color(0x070812);
      threeScene.fog = new THREE.FogExp2(0x070812, 0.16);

      // 2. Studio Environment Reflection (RoomEnvironment)
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
      threeScene.environment = envTarget.texture;
      pmremGenerator.dispose();

      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 40);
      camera.position.set(0, 0, 3.8);
      camera.lookAt(0, 0, 0);

      // 3. Balanced Warm/Cool Studio Lighting Rig
      const hemiLight = new THREE.HemisphereLight(0x2fe8ff, 0x15112a, 0.75);
      threeScene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xffb08a, 1.1);
      keyLight.position.set(3.5, 4.2, 3.0);
      threeScene.add(keyLight);

      // 4. Engine C: Real-Time GPU Ping-Pong Navier-Stokes Fluid Pipeline
      neutralFluidTex = createNeutralFluidDataTexture();
      if (initialQuality.enableMultiPassFluidFbo) {
        fluidPipeline = new GPUFluidSimulationPipeline(
          renderer,
          initialQuality.fluidGridSize
        );
      }

      // Initial scene-calibrated Dual Aurora + Fluid palette
      const initialPalette = computeSceneAuroraPalette(
        liveStateRef.current.scene,
        liveStateRef.current.phase
      );
      const initialMix = computeBackgroundMixWeights(
        liveStateRef.current.backgroundMix
      );

      const currentViolet = new THREE.Color(...initialPalette.engineAPrimary);
      const currentCyan = new THREE.Color(...initialPalette.engineASecondary);
      const currentMagenta = new THREE.Color(
        ...initialPalette.engineCMagentaInterference
      );
      const currentDeep = new THREE.Color(...initialPalette.deepBackground);
      const currentZenith = new THREE.Color(...initialPalette.zenithTint);
      const currentEngineBPrimary = new THREE.Color(
        ...initialPalette.engineBPrimary
      );
      const currentEngineBCoral = new THREE.Color(
        ...initialPalette.engineBCoralHighlight
      );

      // 5. Layers 1–5: Unified Dual Volumetric Aurora (Engine A & B) + GPU Fluid Dynamics (Engine C)
      const fluidGeo = new THREE.PlaneGeometry(2, 2);
      const fluidUniforms = {
        uTime: { value: 0 },
        uTimeB: { value: 17.3 }, // Offset initial phase so Engine A and Engine B never align
        uTimeC: { value: 41.7 },
        uAspect: { value: width / Math.max(1, height) },
        uTurbulence: { value: 0.36 },
        uGravityStrength: { value: 0.25 },
        uSanctuaryAlpha: { value: 0.85 },
        uAudioAmp: { value: 0 },
        uFluidWeight: { value: initialMix.fluidWeight },
        uNebulaWeight: { value: initialMix.nebulaWeight },
        uOrbMode: {
          value: orbDesignToShaderMode(liveStateRef.current.orbDesign),
        },
        uConvergencePulse: { value: 0 },
        uFinalFiveBoost: { value: 0 },
        uCompletionRelease: { value: 0 },
        uCurtainSharpness: { value: initialPalette.auroraCurtainSharpness },
        uSecondaryWaveAmp: { value: initialPalette.secondaryWaveAmplitude },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        uFluidSimTex: {
          value: fluidPipeline ? fluidPipeline.getTexture() : neutralFluidTex,
        },
        uColorViolet: { value: currentViolet.clone() },
        uColorCyan: { value: currentCyan.clone() },
        uColorMagenta: { value: currentMagenta.clone() },
        uColorDeep: { value: currentDeep.clone() },
        uColorZenith: { value: currentZenith.clone() },
        uColorEngineBPrimary: { value: currentEngineBPrimary.clone() },
        uColorEngineBCoral: { value: currentEngineBCoral.clone() },
      };

      const fluidMat = new THREE.ShaderMaterial({
        uniforms: fluidUniforms,
        vertexShader: NEBULA_FLUID_VERTEX_SHADER,
        fragmentShader: NEBULA_FLUID_FRAGMENT_SHADER,
        depthTest: false,
        depthWrite: false,
      });

      const fluidQuad = new THREE.Mesh(fluidGeo, fluidMat);
      fluidQuad.frustumCulled = false;
      fluidQuad.renderOrder = -10;
      threeScene.add(fluidQuad);

      // 6. Layer 6: Extremely Subtle 3D Atmospheric Particles & Light Details
      const particleCount = 2400;
      const positions = new Float32Array(particleCount * 3);
      const phases = new Float32Array(particleCount);
      const speeds = new Float32Array(particleCount);
      const scales = new Float32Array(particleCount);
      const colorMixes = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        const frac = i / particleCount;
        const goldenAngle = i * 2.399963229728653;
        const r = 0.38 + Math.pow(frac, 0.78) * 2.75;
        const z = ((i * 17) % 100) / 28.0 - 2.35;

        positions[i * 3] = Math.cos(goldenAngle) * r;
        positions[i * 3 + 1] = Math.sin(goldenAngle) * r;
        positions[i * 3 + 2] = z;

        phases[i] = ((i * 73) % 1000) / 1000;
        speeds[i] = (i % 2 === 0 ? 1 : -1) * (0.16 + ((i * 31) % 100) / 190);
        scales[i] = 0.52 + ((i * 19) % 100) / 90;
        colorMixes[i] = ((i * 43) % 100) / 100;
      }

      const particlesGeo = new THREE.BufferGeometry();
      particlesGeo.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );
      particlesGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      particlesGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
      particlesGeo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
      particlesGeo.setAttribute(
        'aColorMix',
        new THREE.BufferAttribute(colorMixes, 1)
      );

      const particlesUniforms = {
        uTime: { value: 0 },
        uTurbulence: { value: 0.36 },
        uAudioAmp: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uParticleGain: { value: initialMix.particleGain },
        uColorViolet: { value: currentViolet.clone() },
        uColorCyan: { value: currentCyan.clone() },
        uColorMagenta: { value: currentMagenta.clone() },
      };

      const particlesMat = new THREE.ShaderMaterial({
        uniforms: particlesUniforms,
        vertexShader: QUANTUM_PARTICLES_VERTEX_SHADER,
        fragmentShader: QUANTUM_PARTICLES_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const quantumParticles = new THREE.Points(particlesGeo, particlesMat);
      quantumParticles.frustumCulled = false;
      quantumParticles.renderOrder = 2;
      threeScene.add(quantumParticles);

      // 6b. Modular 3D Celestial Jellyfish Controller (shares threeScene & renderer)
      const celestialJellyController = new CelestialJelly3DSceneController({
        parentScene: threeScene,
        pixelRatio,
        isSoftwareGl,
        initialScene: liveStateRef.current.scene,
        initialPhase: liveStateRef.current.phase,
      });

      // 6c. Modular 3D Living Bloom Controller (shares threeScene & renderer)
      const livingBloomController = new LivingBloom3DSceneController({
        parentScene: threeScene,
        pixelRatio,
        isSoftwareGl,
        initialScene: liveStateRef.current.scene,
        initialPhase: liveStateRef.current.phase,
      });

      // Pre-warm shaders on hardware GPUs
      if (!isSoftwareGl) {
        renderer.compile(threeScene, camera);
      }

      // Pointer tracking for subtle interactive fluid wake & 3D organism deflection
      let targetPtrX = 0.5;
      let targetPtrY = 0.5;
      let currentPtrX = 0.5;
      let currentPtrY = 0.5;
      let pointerActive = false;
      let currentW = width;
      let currentH = height;

      const onPointerMove = (e: PointerEvent) => {
        targetPtrX = e.clientX / Math.max(1, window.innerWidth);
        targetPtrY = 1.0 - e.clientY / Math.max(1, window.innerHeight);
        pointerActive = true;
      };
      const onPointerLeave = () => {
        pointerActive = false;
      };
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerleave', onPointerLeave, { passive: true });

      const onResize = () => {
        if (!container || !renderer) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        currentW = w;
        currentH = h;
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        fluidUniforms.uAspect.value = w / Math.max(1, h);
      };
      window.addEventListener('resize', onResize);

      // Handle WebGL context loss & restoration gracefully
      const onContextLost = (e: Event) => {
        e.preventDefault();
      };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);

      // 7. Centralized Multi-Timescale Animation Loop with Adaptive FPS & Software-WebGL Fence Pacing
      let lastTimeMs = performance.now();
      let simTimeA = 0;
      let simTimeB = 17.3;
      let simTimeC = 41.7;
      let rollingFps = 60;
      let frameId = 0;
      let isDisposed = false;

      const activeRenderer = renderer;

      function afterDraw(cb: () => void) {
        if (isDisposed) return;
        const gl = activeRenderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync
          ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
          : null;
        gl.flush?.();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      function tick() {
        if (isDisposed) return;

        // Visibility-aware rendering: pause GPU work when tab is hidden
        if (document.hidden) {
          lastTimeMs = performance.now();
          frameId = window.setTimeout(tick, 250);
          return;
        }

        const nowMs = performance.now();
        const rawDt = (nowMs - lastTimeMs) / 1000;
        const dt = Math.min(0.1, Math.max(0.001, rawDt));
        lastTimeMs = nowMs;

        // Rolling FPS monitor for adaptive quality scaling
        const instantFps = 1 / Math.max(0.001, rawDt);
        rollingFps = rollingFps * 0.94 + Math.min(120, instantFps) * 0.06;

        const state = liveStateRef.current;

        const audioBands =
          state.audioReactive && state.status === 'running'
            ? soundEngine.getAudioBands()
            : { bass: 0, mid: 0, treble: 0, overall: 0 };
        const audioAmp = audioBands.overall;

        const secondsSinceStart =
          sessionStartMsRef.current > 0
            ? (nowMs - sessionStartMsRef.current) / 1000
            : 999;
        const secondsSinceCompletion =
          sessionCompleteMsRef.current > 0
            ? (nowMs - sessionCompleteMsRef.current) / 1000
            : 999;

        const atmosphere = computeTimerAwareAtmosphereState({
          status: state.status,
          phase: state.phase,
          remainingSeconds: state.remainingSeconds,
          totalSeconds: state.totalSeconds,
          progress: state.progress,
          audioAmplitude: audioAmp,
          reducedMotion: state.reducedMotion,
          secondsSinceStart,
          secondsSinceCompletion,
        });

        const scenePalette = computeSceneAuroraPalette(
          state.scene,
          state.phase
        );
        const mixWeights = computeBackgroundMixWeights(state.backgroundMix);

        // Advance Engine A, Engine B, and Engine C on independent, incommensurate timescales
        const flowMult =
          mixWeights.flowVelocityMultiplier * scenePalette.turbulenceScale;
        simTimeA += dt * atmosphere.engineATimeScale * flowMult;
        simTimeB += dt * atmosphere.engineBTimeScale * flowMult;
        simTimeC += dt * atmosphere.engineCTimeScale * flowMult;

        // Smoothly damp colors toward active Focus Scene & Break state
        _targetViolet.setRGB(...scenePalette.engineAPrimary);
        _targetCyan.setRGB(...scenePalette.engineASecondary);
        _targetMagenta.setRGB(...scenePalette.engineCMagentaInterference);
        _targetDeep.setRGB(...scenePalette.deepBackground);
        _targetZenith.setRGB(...scenePalette.zenithTint);
        _targetEngineBPrimary.setRGB(...scenePalette.engineBPrimary);
        _targetEngineBCoral.setRGB(...scenePalette.engineBCoralHighlight);

        const colorDamp = 1 - Math.exp(-2.8 * dt);
        currentViolet.lerp(_targetViolet, colorDamp);
        currentCyan.lerp(_targetCyan, colorDamp);
        currentMagenta.lerp(_targetMagenta, colorDamp);
        currentDeep.lerp(_targetDeep, colorDamp);
        currentZenith.lerp(_targetZenith, colorDamp);
        currentEngineBPrimary.lerp(_targetEngineBPrimary, colorDamp);
        currentEngineBCoral.lerp(_targetEngineBCoral, colorDamp);

        currentPtrX = THREE.MathUtils.damp(currentPtrX, targetPtrX, 3.5, dt);
        currentPtrY = THREE.MathUtils.damp(currentPtrY, targetPtrY, 3.5, dt);

        // Step Engine C Ping-Pong GPU Fluid Simulation when enabled on hardware GPU
        if (fluidPipeline && !state.reducedMotion && rollingFps >= 26) {
          const simTex = fluidPipeline.step({
            timeA: simTimeA,
            timeB: simTimeB,
            timeC: simTimeC,
            dt,
            turbulence: atmosphere.turbulence * scenePalette.turbulenceScale,
            vorticityGain: scenePalette.fluidVorticityGain,
            convergencePulse: atmosphere.convergencePulse,
            completionRelease: atmosphere.completionRelease,
            pointerX: currentPtrX,
            pointerY: currentPtrY,
          });
          fluidUniforms.uFluidSimTex.value = simTex;
        }

        // Update Master Volumetric Shader Uniforms
        fluidUniforms.uTime.value = simTimeA;
        fluidUniforms.uTimeB.value = simTimeB;
        fluidUniforms.uTimeC.value = simTimeC;
        fluidUniforms.uTurbulence.value = THREE.MathUtils.damp(
          fluidUniforms.uTurbulence.value,
          atmosphere.turbulence * scenePalette.turbulenceScale,
          3.5,
          dt
        );
        fluidUniforms.uGravityStrength.value = THREE.MathUtils.damp(
          fluidUniforms.uGravityStrength.value,
          0.25 + atmosphere.convergencePulse * 0.18,
          3.5,
          dt
        );
        fluidUniforms.uSanctuaryAlpha.value = THREE.MathUtils.damp(
          fluidUniforms.uSanctuaryAlpha.value,
          atmosphere.centralSanctuaryRetention,
          3.5,
          dt
        );
        fluidUniforms.uAudioAmp.value = THREE.MathUtils.damp(
          fluidUniforms.uAudioAmp.value,
          audioAmp,
          8.0,
          dt
        );
        fluidUniforms.uFluidWeight.value = THREE.MathUtils.damp(
          fluidUniforms.uFluidWeight.value,
          mixWeights.fluidWeight * atmosphere.fluidEnergyGain,
          5.0,
          dt
        );
        fluidUniforms.uNebulaWeight.value = THREE.MathUtils.damp(
          fluidUniforms.uNebulaWeight.value,
          mixWeights.nebulaWeight * atmosphere.auroraLuminousIntensity,
          5.0,
          dt
        );
        fluidUniforms.uOrbMode.value = THREE.MathUtils.damp(
          fluidUniforms.uOrbMode.value,
          orbDesignToShaderMode(state.orbDesign),
          4.5,
          dt
        );
        fluidUniforms.uConvergencePulse.value = THREE.MathUtils.damp(
          fluidUniforms.uConvergencePulse.value,
          atmosphere.convergencePulse,
          6.0,
          dt
        );
        fluidUniforms.uFinalFiveBoost.value = THREE.MathUtils.damp(
          fluidUniforms.uFinalFiveBoost.value,
          atmosphere.finalFiveMinBoost,
          2.5,
          dt
        );
        fluidUniforms.uCompletionRelease.value = THREE.MathUtils.damp(
          fluidUniforms.uCompletionRelease.value,
          atmosphere.completionRelease,
          4.5,
          dt
        );
        fluidUniforms.uCurtainSharpness.value = THREE.MathUtils.damp(
          fluidUniforms.uCurtainSharpness.value,
          scenePalette.auroraCurtainSharpness,
          3.5,
          dt
        );
        fluidUniforms.uSecondaryWaveAmp.value = THREE.MathUtils.damp(
          fluidUniforms.uSecondaryWaveAmp.value,
          scenePalette.secondaryWaveAmplitude *
            atmosphere.secondaryAuroraIntensity,
          3.5,
          dt
        );

        fluidUniforms.uPointer.value.set(currentPtrX, currentPtrY);
        fluidUniforms.uColorViolet.value.copy(currentViolet);
        fluidUniforms.uColorCyan.value.copy(currentCyan);
        fluidUniforms.uColorMagenta.value.copy(currentMagenta);
        fluidUniforms.uColorDeep.value.copy(currentDeep);
        fluidUniforms.uColorZenith.value.copy(currentZenith);
        fluidUniforms.uColorEngineBPrimary.value.copy(currentEngineBPrimary);
        fluidUniforms.uColorEngineBCoral.value.copy(currentEngineBCoral);

        // Update Layer 6 Particle Uniforms
        particlesUniforms.uTime.value = simTimeA;
        particlesUniforms.uTurbulence.value = fluidUniforms.uTurbulence.value;
        particlesUniforms.uAudioAmp.value = fluidUniforms.uAudioAmp.value;
        particlesUniforms.uParticleGain.value = THREE.MathUtils.damp(
          particlesUniforms.uParticleGain.value,
          mixWeights.particleGain,
          5.0,
          dt
        );
        particlesUniforms.uColorViolet.value.copy(currentViolet);
        particlesUniforms.uColorCyan.value.copy(currentCyan);
        particlesUniforms.uColorMagenta.value.copy(currentMagenta);

        // Update 3D Celestial Jellyfish Controller
        celestialJellyController.update({
          orbDesign: state.orbDesign,
          scene: state.scene,
          status: state.status,
          phase: state.phase,
          totalSeconds: state.totalSeconds || 2700,
          progress: state.progress,
          audioBands,
          reducedMotion: state.reducedMotion,
          dt,
          pointerNormX: currentPtrX,
          pointerNormY: currentPtrY,
          pointerActive,
          viewportWidth: currentW,
          viewportHeight: currentH,
          camera,
        });

        // Update 3D Living Bloom Controller
        livingBloomController.update({
          orbDesign: state.orbDesign,
          scene: state.scene,
          status: state.status,
          phase: state.phase,
          totalSeconds: state.totalSeconds || 2700,
          progress: state.progress,
          audioBands,
          reducedMotion: state.reducedMotion,
          dt,
          pointerNormX: currentPtrX,
          pointerNormY: currentPtrY,
          pointerActive,
          viewportWidth: currentW,
          viewportHeight: currentH,
          camera,
        });

        activeRenderer.render(threeScene, camera);

        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      }

      frameId = requestAnimationFrame(tick);

      return () => {
        isDisposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerleave', onPointerLeave);
        window.removeEventListener('resize', onResize);
        activeRenderer.domElement.removeEventListener(
          'webglcontextlost',
          onContextLost
        );

        celestialJellyController.dispose();
        livingBloomController.dispose();
        fluidPipeline?.dispose();
        neutralFluidTex?.dispose();
        webgpuDevice?.destroy?.();
        fluidGeo.dispose();
        fluidMat.dispose();
        particlesGeo.dispose();
        particlesMat.dispose();
        envTarget.dispose();
        activeRenderer.dispose();

        if (activeRenderer.domElement.parentNode === container) {
          container.removeChild(activeRenderer.domElement);
        }
      };
    } catch {
      setWebglFailed(true);
      return undefined;
    }
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="quantum-nebula-bg"
      data-background-mix={backgroundMix}
      data-scene-id={scene.id}
      data-timer-status={status}
      data-timer-phase={phase}
      data-engine-architecture="dual-aurora-gpu-fluid"
      style={
        webglFailed
          ? {
              background: `
                radial-gradient(ellipse 85% 55% at 50% 22%, ${scene.colors.primary}28 0%, ${scene.colors.secondary}16 48%, transparent 80%),
                radial-gradient(ellipse 75% 60% at 62% 68%, ${scene.colors.tertiary}22 0%, ${scene.colors.iridescent}12 45%, transparent 75%),
                radial-gradient(circle at 50% 48%, ${scene.colors.secondary}18 0%, ${scene.colors.baseBg} 100%)
              `,
            }
          : undefined
      }
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
};
