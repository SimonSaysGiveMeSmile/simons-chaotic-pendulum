# Chaotic Pendulum - 3D Physics Simulation

A web-based chaotic double pendulum simulation with real physics and high-quality rendering built with Next.js, React Three Fiber, and custom Lagrangian mechanics.

## Features

- 🎨 **High-Quality Rendering**: Post-processing effects including bloom and SSAO
- ⚛️ **Real Physics**: Custom implementation using Lagrangian mechanics for accurate double pendulum simulation
- 🎮 **Interactive Controls**: Fully adjustable parameters via sliders
- 🎯 **Adjustable Parameters**:
  - Base dimensions (width, height, depth)
  - Rod lengths (independently adjustable)
  - Rod thickness
  - Base angle for triangular support structure
  - Masses for both pendulums
  - Gravity strength
  - Damping coefficient
  - Reset button to restart simulation
- 🚀 **Modern Stack**: Built with Next.js 16, React 19, and TypeScript
- 💨 **Performance Optimized**: Client-side only rendering with dynamic imports
- 🎨 **Realistic Materials**: Wooden base with metallic silver pendulum rods

## Tech Stack

- **Next.js 16** - React framework
- **React 19** - UI library
- **React Three Fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for R3F
- **@react-three/postprocessing** - Post-processing effects
- **Three.js** - 3D graphics library
- **Leva** - Control panel for real-time adjustments
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   └── globals.css      # Global styles
├── components/
│   ├── Scene.tsx        # Main 3D scene component
│   └── Pendulum.tsx     # Double pendulum with custom physics
├── next.config.js       # Next.js configuration
├── tsconfig.json        # TypeScript configuration
└── tailwind.config.js   # Tailwind CSS configuration
```

## Physics Implementation

The double pendulum uses the Lagrangian mechanics equations of motion:

- **Chaotic Behavior**: Small changes in initial conditions lead to drastically different outcomes
- **Energy Conservation**: Realistic motion with adjustable damping
- **Accurate Simulation**: Uses numerical integration with frame-rate independent timesteps

## Customization

### Adjusting Pendulum Parameters

Use the control panel on the right side of the screen to adjust:
- **Base Width/Height/Depth**: Size of the wooden base structure
- **Rod 1 Length**: Length of the first pendulum arm
- **Rod 2 Length**: Length of the second pendulum arm
- **Rod Thickness**: Visual thickness of the metal rods
- **Base Angle**: Angle of the triangular support structure
- **Mass 1/Mass 2**: Masses affecting the pendulum dynamics
- **Gravity**: Gravitational acceleration (default 9.81 m/s²)
- **Damping**: Energy loss coefficient (higher = less damping)

### Rendering Quality

Modify post-processing effects in `components/Scene.tsx`:
- `Bloom` - Adjust intensity and luminance threshold
- `SSAO` - Control ambient occlusion samples and intensity

## License

ISC

