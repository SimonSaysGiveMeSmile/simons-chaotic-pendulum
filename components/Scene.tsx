'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing';
import Pendulum from './Pendulum';
import { RefreshIcon, LockIcon, LeftArrowIcon, UpArrowIcon, HomeIcon } from './Icons';
import * as THREE from 'three';

type ViewMode = 'free' | 'positionFix';

// Component to handle camera presets inside the Canvas
function CameraControls({ 
  mode, 
  setMode, 
  cameraPreset,
  controlsRef
}: { 
  mode: ViewMode; 
  setMode: (mode: ViewMode) => void;
  cameraPreset: { preset: 'side' | 'top' | 'default' | null; timestamp: number };
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera } = useThree();

  // Camera preset positions
  const cameraPresets = {
    side: { position: [8, 2, 0] as [number, number, number], target: [0, 2, 0] as [number, number, number] },
    top: { position: [0, 10, 0] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
    default: { position: [6, 4, 8] as [number, number, number], target: [0, 2, 0] as [number, number, number] },
  };

  useEffect(() => {
    if (cameraPreset.preset && camera && controlsRef.current) {
      const presetData = cameraPresets[cameraPreset.preset];
      camera.position.set(...presetData.position);
      camera.lookAt(...presetData.target);
      controlsRef.current.target.set(...presetData.target);
      controlsRef.current.update();
    }
  }, [cameraPreset.timestamp, camera, controlsRef.current]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={mode === 'free'}
      minDistance={3}
      maxDistance={25}
      maxPolarAngle={Math.PI / 2}
    />
  );
}

export default function Scene() {
  const [mode, setMode] = useState<ViewMode>('free');
  const [cameraPreset, setCameraPreset] = useState<{ preset: 'side' | 'top' | 'default' | null; timestamp: number }>({
    preset: null,
    timestamp: 0
  });
  const controlsRef = useRef<any>(null);

  const applyCameraPreset = useCallback((preset: 'side' | 'top' | 'default') => {
    setCameraPreset({ preset, timestamp: Date.now() });
  }, []);

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{ background: '#e8e8e8' }}
      >
        <Suspense fallback={null}>

          {/* Lighting for metallic materials - even, soft lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <directionalLight
            position={[-5, 6, -5]}
            intensity={0.5}
          />

          {/* Camera */}
          <PerspectiveCamera 
            makeDefault 
            position={[6, 4, 8]} 
            fov={60} 
          />

          {/* Pendulum with custom physics */}
          <Pendulum mode={mode} />

          {/* Environment for reflections */}
          <Environment preset="city" background={false} />

          {/* Post-processing Effects */}
          <EffectComposer enableNormalPass>
            <Bloom 
              intensity={0.4} 
              luminanceThreshold={0.8}
              luminanceSmoothing={0.9}
            />
            <SSAO
              samples={31}
              radius={0.1}
              intensity={50}
            />
          </EffectComposer>

          {/* Controls */}
          <CameraControls 
            mode={mode} 
            setMode={setMode} 
            cameraPreset={cameraPreset}
            controlsRef={controlsRef}
          />
        </Suspense>
      </Canvas>

      {/* Custom circular buttons at the bottom - Apple Liquid Glass Style */}
      <div className="absolute bottom-[180px] left-1/2 transform -translate-x-1/2 flex gap-6 z-10 items-center glass-container rounded-full px-4 py-3">
        {/* Mode Toggle Button */}
        <button
          onClick={() => setMode(mode === 'free' ? 'positionFix' : 'free')}
          className="glass-button w-14 h-14 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 text-white/90 hover:text-white"
          title={mode === 'free' ? 'Free Mode' : 'Position Fix Mode'}
          aria-label={mode === 'free' ? 'Switch to Position Fix Mode' : 'Switch to Free Mode'}
        >
          {mode === 'free' ? (
            <RefreshIcon size={22} className="icon-glow" />
          ) : (
            <LockIcon size={22} className="icon-glow" />
          )}
        </button>

        {/* Side View Button */}
        <button
          onClick={() => applyCameraPreset('side')}
          className="glass-button w-14 h-14 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 text-white/90 hover:text-white"
          title="Side View"
          aria-label="Switch to Side View"
        >
          <LeftArrowIcon size={22} className="icon-glow" />
        </button>

        {/* Top View Button */}
        <button
          onClick={() => applyCameraPreset('top')}
          className="glass-button w-14 h-14 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 text-white/90 hover:text-white"
          title="Top View"
          aria-label="Switch to Top View"
        >
          <UpArrowIcon size={22} className="icon-glow" />
        </button>

        {/* Default View Button */}
        <button
          onClick={() => applyCameraPreset('default')}
          className="glass-button w-14 h-14 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 text-white/90 hover:text-white"
          title="Default View"
          aria-label="Switch to Default View"
        >
          <HomeIcon size={22} className="icon-glow" />
        </button>
      </div>

      {/* Social Links Footer - Apple Liquid Glass Style */}
      <div className="absolute bottom-[116px] left-1/2 transform -translate-x-1/2 flex gap-5 z-10 items-center glass-container rounded-full px-6 py-3">
        <a
          href="https://github.com/SimonSaysGiveMeSmile/simons-chaotic-pendulum"
          target="_blank"
          rel="noopener noreferrer"
          className="glass-link px-5 py-2.5 rounded-full transition-all duration-300 text-sm font-semibold cursor-pointer whitespace-nowrap hover:scale-105 active:scale-95 text-white/90 hover:text-white"
          title="GitHub Repository"
        >
          GitHub
        </a>
        <a
          href="https://www.linkedin.com/in/simon-tian-1333a3156/"
          target="_blank"
          rel="noopener noreferrer"
          className="glass-link px-5 py-2.5 rounded-full transition-all duration-300 text-sm font-semibold cursor-pointer whitespace-nowrap hover:scale-105 active:scale-95 text-white/90 hover:text-white"
          title="LinkedIn Profile"
        >
          LinkedIn
        </a>
        <a
          href="https://www.hisimon.pro/"
          target="_blank"
          rel="noopener noreferrer"
          className="glass-link px-5 py-2.5 rounded-full transition-all duration-300 text-sm font-semibold cursor-pointer whitespace-nowrap hover:scale-105 active:scale-95 text-white/90 hover:text-white"
          title="Personal Website"
        >
          Portfolio
        </a>
      </div>
    </div>
  );
}

