'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Scene component to avoid SSR issues with Three.js
const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-xl">Loading 3D Scene...</div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-full h-screen">
      <Scene />
    </main>
  );
}

