'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing';
import Pendulum from './Pendulum';
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
          <EffectComposer>
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

      {/* Custom circular buttons at the bottom */}
      <div className="absolute bottom-[124px] left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
        {/* Mode Toggle Button */}
        <button
          onClick={() => setMode(mode === 'free' ? 'positionFix' : 'free')}
          className="w-25 h-25 rounded-full bg-white/90 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-sm font-medium text-gray-700 hover:text-gray-900 border-2 border-gray-200 hover:border-gray-300"
          title={mode === 'free' ? 'Free Mode' : 'Position Fix Mode'}
        >
          {mode === 'free' ? '🔄' : '🔒'}
        </button>

        {/* Side View Button */}
        <button
          onClick={() => applyCameraPreset('side')}
          className="w-14 h-14 rounded-full bg-white/90 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-sm font-medium text-gray-700 hover:text-gray-900 border-2 border-gray-200 hover:border-gray-300"
          title="Side View"
        >
          ⬅️
        </button>

        {/* Top View Button */}
        <button
          onClick={() => applyCameraPreset('top')}
          className="w-14 h-14 rounded-full bg-white/90 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-sm font-medium text-gray-700 hover:text-gray-900 border-2 border-gray-200 hover:border-gray-300"
          title="Top View"
        >
          ⬆️
        </button>

        {/* Default View Button */}
        <button
          onClick={() => applyCameraPreset('default')}
          className="w-14 h-14 rounded-full bg-white/90 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-sm font-medium text-gray-700 hover:text-gray-900 border-2 border-gray-200 hover:border-gray-300"
          title="Default View"
        >
          🏠
        </button>
      </div>
    </div>
  );
}

