'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { Suspense } from 'react';
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing';
import Pendulum from './Pendulum';

export default function Scene() {
  return (
    <div className="w-full h-full">
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
          <PerspectiveCamera makeDefault position={[6, 4, 8]} fov={60} />

          {/* Pendulum with custom physics */}
          <Pendulum />

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
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={25}
            maxPolarAngle={Math.PI / 2}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

