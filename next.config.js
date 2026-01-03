/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable server-side rendering for 3D components
  experimental: {
    optimizePackageImports: ['@react-three/fiber', '@react-three/drei', '@react-three/rapier'],
  },
}

module.exports = nextConfig

