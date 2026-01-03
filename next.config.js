/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optimize package imports for better bundle size
  experimental: {
    optimizePackageImports: ['@react-three/fiber', '@react-three/drei', '@react-three/rapier'],
  },
}

module.exports = nextConfig

