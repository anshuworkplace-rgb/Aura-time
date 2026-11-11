import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FocusSceneConfig, OrbDesignId, TimerStatus } from '../types/aura';
import { soundEngine } from '../utils/soundSynthesizer';
import {
  NEBULA_FLUID_FRAGMENT_SHADER,
  NEBULA_FLUID_VERTEX_SHADER,
  QUANTUM_PARTICLES_FRAGMENT_SHADER,
  QUANTUM_PARTICLES_VERTEX_SHADER,
  computeBackgroundMixWeights,
  computeFluidTurbulenceGain,
  interpolateNebulaSpectrum,
  orbDesignToShaderMode,
} from '../utils/quantumNebulaShaders';

interface QuantumNebulaBackgroundProps {
  scene: FocusSceneConfig;
  orbDesign?: OrbDesignId;
  status: TimerStatus;
  progress: number;
  audioReactive: boolean;
  reducedMotion: boolean;
  backgroundMix?: number;
}

// Pre-allocated module-scope helpers for zero GC in the animation loop
const _targetViolet = new THREE.Color();
const _targetCyan = new THREE.Color();
const _targetMagenta = new THREE.Color();
const _targetDeep = new THREE.Color();

export const QuantumNebulaBackground: React.FC<QuantumNebulaBackgroundProps> = ({
  scene,
  orbDesign = 'original',
  status,
  progress,
  audioReactive,
  reducedMotion,
  backgroundMix = 0.52,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const liveStateRef = useRef({
    scene,
    orbDesign,
    status,
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
      progress,
      audioReactive,
      reducedMotion,
      backgroundMix,
    };
  }, [
    scene,
    orbDesign,
    status,
    progress,
    audioReactive,
    reducedMotion,
    backgroundMix,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
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

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      const pixelRatio = isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio || 1, 2);

      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
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

      // Initial spectrum correlated with active Focus Scene & initial Fluid × Nebula mix
      const initialSpec = interpolateNebulaSpectrum(liveStateRef.current.scene);
      const initialMix = computeBackgroundMixWeights(
        liveStateRef.current.backgroundMix
      );
      const currentViolet = new THREE.Color(...initialSpec.violet);
      const currentCyan = new THREE.Color(...initialSpec.cyan);
      const currentMagenta = new THREE.Color(...initialSpec.magenta);
      const currentDeep = new THREE.Color(...initialSpec.deepSpace);

      // 4. Layer 1: Full-Viewport Dual-Layer Quantum Nebula × GPU Fluid Dynamics Plane
      const fluidGeo = new THREE.PlaneGeometry(2, 2);
      const fluidUniforms = {
        uTime: { value: 0 },
        uAspect: { value: width / Math.max(1, height) },
        uTurbulence: { value: 0.38 },
        uGravityStrength: { value: 0.25 },
        uSanctuaryAlpha: { value: 0.75 },
        uAudioAmp: { value: 0 },
        uFluidWeight: { value: initialMix.fluidWeight },
        uNebulaWeight: { value: initialMix.nebulaWeight },
        uOrbMode: {
          value: orbDesignToShaderMode(liveStateRef.current.orbDesign),
        },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        uColorViolet: { value: currentViolet.clone() },
        uColorCyan: { value: currentCyan.clone() },
        uColorMagenta: { value: currentMagenta.clone() },
        uColorDeep: { value: currentDeep.clone() },
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

      // 5. Layer 2: Soft GPU-Accelerated Quantum Particle Field (2,800 calm bokeh motes)
      const particleCount = 2800;
      const positions = new Float32Array(particleCount * 3);
      const phases = new Float32Array(particleCount);
      const speeds = new Float32Array(particleCount);
      const scales = new Float32Array(particleCount);
      const colorMixes = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        const frac = i / particleCount;
        const goldenAngle = i * 2.399963229728653;
        const r = 0.36 + Math.pow(frac, 0.76) * 2.65;
        const z = ((i * 17) % 100) / 28.0 - 2.3;

        positions[i * 3] = Math.cos(goldenAngle) * r;
        positions[i * 3 + 1] = Math.sin(goldenAngle) * r;
        positions[i * 3 + 2] = z;

        phases[i] = ((i * 73) % 1000) / 1000;
        speeds[i] = (i % 2 === 0 ? 1 : -1) * (0.18 + ((i * 31) % 100) / 180);
        scales[i] = 0.55 + ((i * 19) % 100) / 85;
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
        uTurbulence: { value: 0.38 },
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

      // Pre-warm shaders on hardware GPUs
      if (!isSoftwareGl) {
        renderer.compile(threeScene, camera);
      }

      // Pointer tracking for subtle interactive fluid drift
      let targetPtrX = 0.5;
      let targetPtrY = 0.5;
      let currentPtrX = 0.5;
      let currentPtrY = 0.5;

      const onPointerMove = (e: PointerEvent) => {
        targetPtrX = e.clientX / Math.max(1, window.innerWidth);
        targetPtrY = 1.0 - e.clientY / Math.max(1, window.innerHeight);
      };
      window.addEventListener('pointermove', onPointerMove, { passive: true });

      const onResize = () => {
        if (!container || !renderer) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        fluidUniforms.uAspect.value = w / Math.max(1, h);
      };
      window.addEventListener('resize', onResize);

      // Handle WebGL context loss gracefully
      const onContextLost = (e: Event) => {
        e.preventDefault();
      };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);

      // 6. Continuous Animation Loop with Software-WebGL Fence Pacing & Tab Visibility Pause
      let lastTimeMs = performance.now();
      let simTime = 0;
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

        // Pause GPU work when tab is hidden
        if (document.hidden) {
          lastTimeMs = performance.now();
          frameId = window.setTimeout(tick, 250);
          return;
        }

        const nowMs = performance.now();
        const dt = Math.min(0.1, Math.max(0.001, (nowMs - lastTimeMs) / 1000));
        lastTimeMs = nowMs;
        const state = liveStateRef.current;

        const audioAmp =
          state.audioReactive && state.status === 'running'
            ? soundEngine.getAudioAmplitude()
            : 0;

        const dynamics = computeFluidTurbulenceGain(
          state.status,
          state.progress,
          audioAmp,
          state.reducedMotion
        );

        const mixWeights = computeBackgroundMixWeights(state.backgroundMix);

        simTime += dt * dynamics.flowSpeed * mixWeights.flowVelocityMultiplier;

        // Smoothly damp spectrum colors toward active Focus Scene
        const targetSpec = interpolateNebulaSpectrum(state.scene);
        _targetViolet.setRGB(...targetSpec.violet);
        _targetCyan.setRGB(...targetSpec.cyan);
        _targetMagenta.setRGB(...targetSpec.magenta);
        _targetDeep.setRGB(...targetSpec.deepSpace);

        const colorDamp = 1 - Math.exp(-3.2 * dt);
        currentViolet.lerp(_targetViolet, colorDamp);
        currentCyan.lerp(_targetCyan, colorDamp);
        currentMagenta.lerp(_targetMagenta, colorDamp);
        currentDeep.lerp(_targetDeep, colorDamp);

        currentPtrX = THREE.MathUtils.damp(currentPtrX, targetPtrX, 3.5, dt);
        currentPtrY = THREE.MathUtils.damp(currentPtrY, targetPtrY, 3.5, dt);

        fluidUniforms.uTime.value = simTime;
        fluidUniforms.uTurbulence.value = THREE.MathUtils.damp(
          fluidUniforms.uTurbulence.value,
          dynamics.turbulence,
          3.5,
          dt
        );
        fluidUniforms.uGravityStrength.value = THREE.MathUtils.damp(
          fluidUniforms.uGravityStrength.value,
          dynamics.gravitationalStrength,
          3.5,
          dt
        );
        fluidUniforms.uSanctuaryAlpha.value = THREE.MathUtils.damp(
          fluidUniforms.uSanctuaryAlpha.value,
          dynamics.centralSanctuaryAlpha,
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
          mixWeights.fluidWeight,
          5.0,
          dt
        );
        fluidUniforms.uNebulaWeight.value = THREE.MathUtils.damp(
          fluidUniforms.uNebulaWeight.value,
          mixWeights.nebulaWeight,
          5.0,
          dt
        );
        fluidUniforms.uOrbMode.value = THREE.MathUtils.damp(
          fluidUniforms.uOrbMode.value,
          orbDesignToShaderMode(state.orbDesign),
          4.5,
          dt
        );
        fluidUniforms.uPointer.value.set(currentPtrX, currentPtrY);
        fluidUniforms.uColorViolet.value.copy(currentViolet);
        fluidUniforms.uColorCyan.value.copy(currentCyan);
        fluidUniforms.uColorMagenta.value.copy(currentMagenta);
        fluidUniforms.uColorDeep.value.copy(currentDeep);

        particlesUniforms.uTime.value = simTime;
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
        window.removeEventListener('resize', onResize);
        activeRenderer.domElement.removeEventListener(
          'webglcontextlost',
          onContextLost
        );

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
      style={
        webglFailed
          ? {
              background: `radial-gradient(circle at 50% 45%, ${scene.colors.primary}22 0%, ${scene.colors.secondary}14 45%, ${scene.colors.baseBg} 100%)`,
            }
          : undefined
      }
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
};
