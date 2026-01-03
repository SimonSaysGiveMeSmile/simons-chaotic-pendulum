'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls, button } from 'leva';
import * as THREE from 'three';

export default function Pendulum() {
  // Adjustable parameters with sliders
  const {
    baseWidth,
    baseHeight,
    baseDepth,
    rod1Length,
    rod2Length,
    rodThickness,
    baseRodAngle,
    mass1,
    mass2,
    gravity,
    damping,
  } = useControls('Pendulum Settings', {
    baseWidth: { value: 2.5, min: 1, max: 5, step: 0.1, label: 'Base Width' },
    baseHeight: { value: 0.3, min: 0.1, max: 1, step: 0.05, label: 'Base Height' },
    baseDepth: { value: 0.3, min: 0.1, max: 1, step: 0.05, label: 'Base Depth' },
    rod1Length: { value: 2.5, min: 1, max: 5, step: 0.1, label: 'Rod 1 Length' },
    rod2Length: { value: 1.8, min: 0.5, max: 4, step: 0.1, label: 'Rod 2 Length' },
    rodThickness: { value: 0.05, min: 0.02, max: 0.15, step: 0.01, label: 'Rod Thickness' },
    baseRodAngle: { value: 30, min: 15, max: 60, step: 1, label: 'Base Angle (deg)' },
    mass1: { value: 1.5, min: 0.5, max: 5, step: 0.1, label: 'Mass 1' },
    mass2: { value: 1.2, min: 0.5, max: 5, step: 0.1, label: 'Mass 2' },
    gravity: { value: 9.81, min: 1, max: 20, step: 0.1, label: 'Gravity' },
    damping: { value: 0.995, min: 0.95, max: 0.999, step: 0.001, label: 'Damping' },
    Reset: button(() => {
      setAngle1(Math.PI / 2);
      setAngle2(Math.PI / 2);
      setAngVel1(0);
      setAngVel2(0);
    }),
  });

  // Physics state
  const [angle1, setAngle1] = useState(Math.PI / 2); // Initial angle for first pendulum
  const [angle2, setAngle2] = useState(Math.PI / 2); // Initial angle for second pendulum
  const [angVel1, setAngVel1] = useState(0); // Angular velocity 1
  const [angVel2, setAngVel2] = useState(0); // Angular velocity 2

  const rod1Ref = useRef<THREE.Group>(null);
  const rod2Ref = useRef<THREE.Group>(null);

  const angleRad = (baseRodAngle * Math.PI) / 180;
  const baseRodLength = baseHeight / Math.tan(angleRad);
  const pivotHeight = baseHeight;
  const pivotPosition: [number, number, number] = [0, pivotHeight, 0];

  // Physics simulation using lagrangian mechanics for double pendulum
  useFrame((state, delta) => {
    // Limit delta to prevent instability
    const dt = Math.min(delta, 0.016);

    const g = gravity;
    const l1 = rod1Length;
    const l2 = rod2Length;
    const m1 = mass1;
    const m2 = mass2;

    // Calculate angular accelerations using Lagrangian equations
    const num1a = -g * (2 * m1 + m2) * Math.sin(angle1);
    const num1b = -m2 * g * Math.sin(angle1 - 2 * angle2);
    const num1c = -2 * Math.sin(angle1 - angle2) * m2;
    const num1d = angVel2 * angVel2 * l2 + angVel1 * angVel1 * l1 * Math.cos(angle1 - angle2);
    const den1 = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * angle1 - 2 * angle2));
    const angAcc1 = (num1a + num1b + num1c * num1d) / den1;

    const num2a = 2 * Math.sin(angle1 - angle2);
    const num2b = angVel1 * angVel1 * l1 * (m1 + m2);
    const num2c = g * (m1 + m2) * Math.cos(angle1);
    const num2d = angVel2 * angVel2 * l2 * m2 * Math.cos(angle1 - angle2);
    const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * angle1 - 2 * angle2));
    const angAcc2 = (num2a * (num2b + num2c + num2d)) / den2;

    // Update angular velocities and angles
    const newAngVel1 = (angVel1 + angAcc1 * dt) * damping;
    const newAngVel2 = (angVel2 + angAcc2 * dt) * damping;
    const newAngle1 = angle1 + newAngVel1 * dt;
    const newAngle2 = angle2 + newAngVel2 * dt;

    setAngVel1(newAngVel1);
    setAngVel2(newAngVel2);
    setAngle1(newAngle1);
    setAngle2(newAngle2);

    // Update visual representation
    if (rod1Ref.current) {
      const x1 = pivotPosition[0] + (l1 / 2) * Math.sin(newAngle1);
      const y1 = pivotPosition[1] - (l1 / 2) * Math.cos(newAngle1);
      rod1Ref.current.position.set(x1, y1, 0);
      rod1Ref.current.rotation.z = newAngle1;
    }

    if (rod2Ref.current) {
      const x1end = pivotPosition[0] + l1 * Math.sin(newAngle1);
      const y1end = pivotPosition[1] - l1 * Math.cos(newAngle1);
      const x2 = x1end + (l2 / 2) * Math.sin(newAngle2);
      const y2 = y1end - (l2 / 2) * Math.cos(newAngle2);
      rod2Ref.current.position.set(x2, y2, 0);
      rod2Ref.current.rotation.z = newAngle2;
    }
  });

  return (
    <group>
      {/* Wooden Base - Triangle Frame */}
      <group position={[0, 0, 0]}>
        {/* Base bottom horizontal beam */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[baseWidth, baseHeight, baseDepth]} />
          <meshStandardMaterial 
            color="#8B4513"
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Left support rod - angled */}
        <mesh 
          position={[-baseWidth / 4, baseHeight / 2, 0]}
          rotation={[0, 0, angleRad]}
          castShadow 
          receiveShadow
        >
          <cylinderGeometry args={[rodThickness * 0.8, rodThickness * 0.8, baseRodLength, 16]} />
          <meshStandardMaterial 
            color="#C0C0C0"
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>

        {/* Right support rod - angled */}
        <mesh 
          position={[baseWidth / 4, baseHeight / 2, 0]}
          rotation={[0, 0, -angleRad]}
          castShadow 
          receiveShadow
        >
          <cylinderGeometry args={[rodThickness * 0.8, rodThickness * 0.8, baseRodLength, 16]} />
          <meshStandardMaterial 
            color="#C0C0C0"
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>

        {/* Pivot point sphere */}
        <mesh position={pivotPosition} castShadow>
          <sphereGeometry args={[rodThickness * 1.5, 32, 32]} />
          <meshStandardMaterial 
            color="#888888"
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>
      </group>

      {/* First Pendulum Arm (Rod 1) */}
      <group ref={rod1Ref}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[rodThickness, rodThickness, rod1Length, 16]} />
          <meshStandardMaterial 
            color="#D3D3D3"
            roughness={0.15}
            metalness={0.95}
            envMapIntensity={1.5}
          />
        </mesh>
        {/* Mass ball at the bottom */}
        <mesh position={[0, -rod1Length / 2, 0]} castShadow>
          <sphereGeometry args={[rodThickness * 2.5, 32, 32]} />
          <meshStandardMaterial 
            color="#A9A9A9"
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>
      </group>

      {/* Second Pendulum Arm (Rod 2) */}
      <group ref={rod2Ref}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[rodThickness * 0.8, rodThickness * 0.8, rod2Length, 16]} />
          <meshStandardMaterial 
            color="#D3D3D3"
            roughness={0.15}
            metalness={0.95}
            envMapIntensity={1.5}
          />
        </mesh>
        {/* Mass ball at the end */}
        <mesh position={[0, -rod2Length / 2, 0]} castShadow>
          <sphereGeometry args={[rodThickness * 2, 32, 32]} />
          <meshStandardMaterial 
            color="#A9A9A9"
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>
      </group>

      {/* Ground Plane */}
      <mesh receiveShadow position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial 
          color="#34495e"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}
