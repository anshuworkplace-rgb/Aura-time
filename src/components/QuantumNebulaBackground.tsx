import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FocusSceneConfig, TimerStatus } from '../types/aura';
import { soundEngine } from '../utils/soundSynthesizer';
import {
  NEBULA_FLUID_FRAGMENT_SHADER,
  NEBULA_FLUID_VERTEX_SHADER,
  QUANTUM_PARTICLES_FRAGMENT_SHADER,
  QUANTUM_PARTICLES_VERTEX_SHADER,
  computeFluidTurbulenceGain,
  interpolateNebulaSpectrum,
} from '../utils/quantumNebulaShaders';

interface QuantumNebulaBackgroundProps {
  scene: FocusSceneConfig;
  status: TimerStatus;
  progress: number;
  audioReactive: boolean;
  reducedMotion: boolean;
}

// Pre-allocated module-scope helpers for zero GC in the animation loop
const _targetViolet = new THREE.Color();
const _targetCyan = new THREE.Color();
const _targetMagenta = new THREE.Color();
const _targetDeep = new THREE.Color();
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();
const _dummyEuler = new THREE.Euler();
const _instanceColor = new THREE.Color();

export const QuantumNebulaBackground: React.FC<QuantumNebulaBackgroundProps> = ({
  scene,
  status,
  progress,
  audioReactive,
  reducedMotion,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const liveStateRef = useRef({
    scene,
    status,
    progress,
    audioReactive,
    reducedMotion,
  });

  useEffect(() => {
    liveStateRef.current = {
      scene,
      status,
      progress,
      audioReactive,
      reducedMotion,
    };
  }, [scene, status, progress, audioReactive, reducedMotion]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

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

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0x070812);
    threeScene.fog = new THREE.FogExp2(0x070812, 0.14);

    // 2. Mandatory Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    threeScene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 40);
    camera.position.set(0, 0, 3.8);
    camera.lookAt(0, 0, 0);

    // 3. Balanced Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x2fe8ff, 0x15112a, 0.9);
    threeScene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffb08a, 1.35);
    keyLight.position.set(3.5, 4.2, 3.0);
    threeScene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x8a5cff, 1.15);
    rimLight.position.set(-4.0, -2.5, 2.2);
    threeScene.add(rimLight);

    // Initial spectrum
    const initialSpec = interpolateNebulaSpectrum(liveStateRef.current.scene);
    const currentViolet = new THREE.Color(...initialSpec.violet);
    const currentCyan = new THREE.Color(...initialSpec.cyan);
    const currentMagenta = new THREE.Color(...initialSpec.magenta);
    const currentDeep = new THREE.Color(...initialSpec.deepSpace);

    // 4. Layer 1: Full-Viewport Volumetric Quantum Nebula × GPU Fluid Dynamics Plane
    const fluidGeo = new THREE.PlaneGeometry(2, 2);
    const fluidUniforms = {
      uTime: { value: 0 },
      uAspect: { value: width / Math.max(1, height) },
      uTurbulence: { value: 0.52 },
      uGravityStrength: { value: 0.32 },
      uSanctuaryAlpha: { value: 0.82 },
      uAudioAmp: { value: 0 },
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

    // 5. Layer 2: Composite 3D Relativistic Energy Currents & Orbital Ring Group
    const cosmicCurrentsGroup = new THREE.Group();
    cosmicCurrentsGroup.position.set(0, -0.05, -0.4);
    threeScene.add(cosmicCurrentsGroup);

    // Part A: Primary Outer Relativistic Accretion Torus (PBR + onBeforeCompile wave)
    const outerTorusGeo = new THREE.TorusGeometry(1.52, 0.008, 16, 128);
    const outerTorusMat = new THREE.MeshStandardMaterial({
      color: 0x2fe8ff,
      emissive: 0x1a6b88,
      emissiveIntensity: 0.65,
      metalness: 0.88,
      roughness: 0.18,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    outerTorusMat.onBeforeCompile = (shader) => {
      shader.uniforms.uWaveTime = { value: 0 };
      outerTorusMat.userData.shader = shader;
      shader.vertexShader =
        'uniform float uWaveTime;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          transformed.z += sin(position.x * 3.0 + uWaveTime * 1.4) * 0.045;
          `
        );
    };
    const outerTorusMesh = new THREE.Mesh(outerTorusGeo, outerTorusMat);
    outerTorusMesh.rotation.set(0.62, -0.28, 0.15);
    cosmicCurrentsGroup.add(outerTorusMesh);

    // Part B: Secondary Counter-Rotating Ion Violet Harmonic Filament
    const innerTorusGeo = new THREE.TorusGeometry(1.24, 0.006, 12, 110);
    const innerTorusMat = new THREE.MeshStandardMaterial({
      color: 0x8a5cff,
      emissive: 0x4b2499,
      emissiveIntensity: 0.7,
      metalness: 0.6,
      roughness: 0.46, // >= 0.25 roughness difference from Part A
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const innerTorusMesh = new THREE.Mesh(innerTorusGeo, innerTorusMat);
    innerTorusMesh.rotation.set(-0.54, 0.38, -0.22);
    cosmicCurrentsGroup.add(innerTorusMesh);

    // Part C: Tertiary Signal Magenta Equatorial Gravity Arc
    const arcTorusGeo = new THREE.TorusGeometry(1.78, 0.005, 12, 120);
    const arcTorusMat = new THREE.MeshStandardMaterial({
      color: 0xff4fa3,
      emissive: 0x7a1c4b,
      emissiveIntensity: 0.55,
      metalness: 0.35,
      roughness: 0.72,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const arcTorusMesh = new THREE.Mesh(arcTorusGeo, arcTorusMat);
    arcTorusMesh.rotation.set(0.95, 0.12, -0.45);
    cosmicCurrentsGroup.add(arcTorusMesh);

    // Part D: Instanced Deep-Space Quantum Nodes along the Orbital Field (64 instances)
    const nodeCount = 64;
    const nodeGeo = new THREE.OctahedronGeometry(0.016, 1);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xf5f6ff,
      emissive: 0x2fe8ff,
      emissiveIntensity: 0.8,
      metalness: 0.92,
      roughness: 0.15,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const instancedNodes = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);
    for (let i = 0; i < nodeCount; i++) {
      const theta = (i / nodeCount) * Math.PI * 2;
      const rad = 1.35 + (i % 5) * 0.22;
      const zOff = Math.sin(theta * 3) * 0.45 - 0.3;
      _dummyPos.set(Math.cos(theta) * rad, Math.sin(theta) * rad, zOff);
      _dummyEuler.set(theta, theta * 0.5, 0);
      _dummyQuat.setFromEuler(_dummyEuler);
      const sc = 0.85 + (i % 4) * 0.1;
      _dummyScale.set(sc, sc, sc);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
      instancedNodes.setMatrixAt(i, _dummyMatrix);

      if (i % 3 === 0) _instanceColor.setHex(0x2fe8ff);
      else if (i % 3 === 1) _instanceColor.setHex(0x8a5cff);
      else _instanceColor.setHex(0xff4fa3);
      instancedNodes.setColorAt(i, _instanceColor);
    }
    instancedNodes.instanceMatrix.needsUpdate = true;
    if (instancedNodes.instanceColor) {
      instancedNodes.instanceColor.needsUpdate = true;
    }
    instancedNodes.computeBoundingSphere();
    cosmicCurrentsGroup.add(instancedNodes);

    // 6. Layer 3: GPU-Accelerated Quantum Particle System (4,200 particles)
    const particleCount = 4200;
    const positions = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const scales = new Float32Array(particleCount);
    const colorMixes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Deterministic golden-ratio spiral distribution across deep space
      const frac = i / particleCount;
      const goldenAngle = i * 2.399963229728653;
      const r = 0.52 + Math.pow(frac, 0.72) * 2.85;
      const z = ((i * 17) % 100) / 25.0 - 2.4;

      positions[i * 3] = Math.cos(goldenAngle) * r;
      positions[i * 3 + 1] = Math.sin(goldenAngle) * r;
      positions[i * 3 + 2] = z;

      phases[i] = ((i * 73) % 1000) / 1000;
      speeds[i] = (i % 2 === 0 ? 1 : -1) * (0.25 + ((i * 31) % 100) / 140);
      scales[i] = 0.65 + ((i * 19) % 100) / 70;
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
      uTurbulence: { value: 0.52 },
      uAudioAmp: { value: 0 },
      uPixelRatio: { value: pixelRatio },
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

    // Pointer tracking for subtle interactive gravitational vortex
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
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      fluidUniforms.uAspect.value = w / Math.max(1, h);
    };
    window.addEventListener('resize', onResize);

    // 7. Continuous Animation Loop with Software-WebGL Fence Pacing
    let lastTimeMs = performance.now();
    let simTime = 0;
    let frameId = 0;
    let isDisposed = false;

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
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

      simTime += dt * dynamics.flowSpeed;

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

      // Smoothly damp pointer coordinates
      currentPtrX = THREE.MathUtils.damp(currentPtrX, targetPtrX, 4.5, dt);
      currentPtrY = THREE.MathUtils.damp(currentPtrY, targetPtrY, 4.5, dt);

      // Update Volumetric Fluid Uniforms
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
      fluidUniforms.uPointer.value.set(currentPtrX, currentPtrY);
      fluidUniforms.uColorViolet.value.copy(currentViolet);
      fluidUniforms.uColorCyan.value.copy(currentCyan);
      fluidUniforms.uColorMagenta.value.copy(currentMagenta);
      fluidUniforms.uColorDeep.value.copy(currentDeep);

      // Update GPU Particle Uniforms
      particlesUniforms.uTime.value = simTime;
      particlesUniforms.uTurbulence.value = fluidUniforms.uTurbulence.value;
      particlesUniforms.uAudioAmp.value = fluidUniforms.uAudioAmp.value;
      particlesUniforms.uColorViolet.value.copy(currentViolet);
      particlesUniforms.uColorCyan.value.copy(currentCyan);
      particlesUniforms.uColorMagenta.value.copy(currentMagenta);

      // Rotate 3D Relativistic Energy Currents & update vertex wave shader
      cosmicCurrentsGroup.rotation.z = simTime * 0.08;
      cosmicCurrentsGroup.rotation.x =
        Math.sin(simTime * 0.15) * 0.08 + (currentPtrY - 0.5) * 0.12;
      cosmicCurrentsGroup.rotation.y =
        Math.cos(simTime * 0.12) * 0.08 + (currentPtrX - 0.5) * 0.12;

      outerTorusMesh.rotation.z = simTime * 0.14;
      innerTorusMesh.rotation.z = -simTime * 0.19;
      arcTorusMesh.rotation.y = simTime * 0.11;

      outerTorusMat.color.copy(currentCyan);
      innerTorusMat.color.copy(currentViolet);
      arcTorusMat.color.copy(currentMagenta);

      if (outerTorusMat.userData.shader) {
        outerTorusMat.userData.shader.uniforms.uWaveTime.value = simTime;
      }

      renderer.render(threeScene, camera);

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

      fluidGeo.dispose();
      fluidMat.dispose();
      outerTorusGeo.dispose();
      outerTorusMat.dispose();
      innerTorusGeo.dispose();
      innerTorusMat.dispose();
      arcTorusGeo.dispose();
      arcTorusMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      envTarget.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="quantum-nebula-bg"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
};
