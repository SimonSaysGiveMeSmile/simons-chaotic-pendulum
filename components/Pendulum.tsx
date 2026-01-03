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
    supportHeight,
    apexSpacing,
    rod1Length,
    rod2Length,
    rodThickness,
    pivotPosition,
    rod2AttachmentPosition,
    rod2PivotPosition,
    gravity,
    initialTheta1Deg,
    initialTheta2Deg,
    initialOmega1,
    rod1MomentumBoost,
  } = useControls('Pendulum Settings', {
    baseWidth: { value: 3, min: 1, max: 5, step: 0.1, label: 'Base Width' },
    baseHeight: { value: 0.3, min: 0.1, max: 0.5, step: 0.05, label: 'Base Height' },
    baseDepth: { value: 1, min: 0.1, max: 1, step: 0.05, label: 'Base Depth' },
    supportHeight: { value: 1.5, min: 0.5, max: 3, step: 0.1, label: 'Support Height' },
    apexSpacing: { value: 0, min: -2, max: 2, step: 0.01, label: 'Apex Spacing (0=meet at center)' },
    rod1Length: { value: 1.9, min: 0.5, max: 3, step: 0.1, label: 'Rod 1 Length (Long)' },
    rod2Length: { value: 1.3, min: 0.5, max: 2, step: 0.1, label: 'Rod 2 Length (Short)' },
    rodThickness: { value: 0.04, min: 0.02, max: 0.1, step: 0.01, label: 'Rod Thickness' },
    pivotPosition: { value: -0.3, min: -10, max: 10, step: 0.01, label: 'Pivot Position on Rod 1 (0=base, 1=end)' },
    rod2AttachmentPosition: { value: 0.03, min: 0, max: 1, step: 0.01, label: 'Rod 2 Attachment on Rod 1 (0=pivot, 1=end)' },
    rod2PivotPosition: { value: -0.3, min: -1, max: 1, step: 0.01, label: 'Pivot Position on Rod 2 (0=attachment, 1=end)' },
    gravity: { value: 1.0, min: 0.1, max: 5, step: 0.1, label: 'Gravity' },
    initialTheta1Deg: { value: 5.73, min: -360, max: 360, step: 0.1, label: 'Initial Angle 1 (deg)' },
    initialTheta2Deg: { value: 90, min: -360, max: 360, step: 0.1, label: 'Initial Angle 2 (deg)' },
    initialOmega1: { value: 1, min: -10, max: 10, step: 0.1, label: 'Initial Angular Velocity 1 (rad/s)' },
    rod1MomentumBoost: { value: 0, min: 0, max: 5, step: 0.1, label: 'Rod 1 Momentum Boost' },
    Reset: button(() => {
      const theta1Rad = (initialTheta1Deg * Math.PI) / 180;
      const theta2Rad = (initialTheta2Deg * Math.PI) / 180;
      setTheta1(theta1Rad);
      setTheta2(theta2Rad);
      setOmega1(initialOmega1);
      setOmega2(0);
    }),
  });

  // Physics state for double pendulum (from MATLAB code)
  // State vector u = [theta1, theta2, omega1, omega2]
  // Angles can be any value (full 360 degrees), sine/cosine handle periodicity
  const [theta1, setTheta1] = useState((initialTheta1Deg * Math.PI) / 180); // First pendulum angle (radians)
  const [theta2, setTheta2] = useState((initialTheta2Deg * Math.PI) / 180); // Second pendulum angle (radians)
  const [omega1, setOmega1] = useState(initialOmega1); // First angular velocity
  const [omega2, setOmega2] = useState(0); // Second angular velocity

  const rod1Ref = useRef<THREE.Group>(null);
  const rod2Ref = useRef<THREE.Group>(null);

  // Calculate positions for A-frame structure
  const baseY = baseHeight / 2;
  
  // Base positions of supports (wider at bottom)
  const baseSpacing = baseWidth * 0.35;
  
  // Apex position where both supports meet (adjustable spacing)
  // apexSpacing = 0 means they meet exactly at center (x=0)
  // apexSpacing > 0 means they're separated at the top
  const apexX = 0; // Always centered horizontally
  const apexY = baseY + supportHeight;
  const apexHalfSpacing = apexSpacing / 2; // Half the spacing at the top
  
  // Calculate the actual length of the slanted support rods
  // Left support: from (-baseSpacing, baseY) to (-apexHalfSpacing, apexY)
  // Right support: from (baseSpacing, baseY) to (apexHalfSpacing, apexY)
  const leftSupportLength = Math.sqrt(
    Math.pow(supportHeight, 2) + Math.pow(-baseSpacing - (-apexHalfSpacing), 2)
  );
  const rightSupportLength = Math.sqrt(
    Math.pow(supportHeight, 2) + Math.pow(baseSpacing - apexHalfSpacing, 2)
  );
  
  // Calculate the angle for each support rod (flipped horizontally)
  // Left support: from (-baseSpacing, baseY) to (-apexHalfSpacing, apexY)
  // Delta X = -apexHalfSpacing - (-baseSpacing) = baseSpacing - apexHalfSpacing (positive, moving right)
  // Delta Y = supportHeight (positive, moving up)
  // Flipped horizontally: swap the angles
  const leftSupportAngle = Math.atan2(apexHalfSpacing - baseSpacing, supportHeight);
  // Right support: from (baseSpacing, baseY) to (apexHalfSpacing, apexY)
  // Delta X = apexHalfSpacing - baseSpacing (negative, moving left)
  // Delta Y = supportHeight (positive, moving up)
  // Flipped horizontally: swap the angles
  const rightSupportAngle = Math.atan2(baseSpacing - apexHalfSpacing, supportHeight);
  
  // Base pivot point at the apex where supports meet (or center if they don't meet)
  const basePivotX = apexX;
  const basePivotY = apexY;
  
  // Calculate actual pivot position along rod1
  // pivotPositionOnRod1: 0 = at apex (top of rod1), 1 = at end of rod1
  // We'll calculate this dynamically in the animation loop based on current rod1 angle

  // Physics simulation using the MATLAB "Swinging Sticks" equations
  useFrame((state, delta) => {
    // Limit delta to prevent instability
    const dt = Math.min(delta, 0.01);

    const g = gravity;
    const m1 = 5; // Mass of first pendulum (heavier)
    const m2 = 1; // Mass of second pendulum (lighter)
    
    // From MATLAB code: Mass matrix M
    const c = Math.cos(theta1 - theta2);
    const s = Math.sin(theta1 - theta2);
    
    // Right hand side (driving force): f = [omega1; omega2; f3; f4]
    // Add momentum boost to rod 1 to help it rotate past 180 degrees
    const f3 = -g * Math.sin(theta1) - s * omega2 * omega2 + rod1MomentumBoost;
    const f4 = -g * Math.sin(theta2) + s * omega1 * omega1;
    
    // Solve M * [0; 0; alpha1; alpha2] = f
    // M = [1 0 0 0; 0 1 0 0; 0 0 m1 c; 0 0 c m2]
    // This gives: m1*alpha1 + c*alpha2 = f3
    //             c*alpha1 + m2*alpha2 = f4
    
    const det = m1 * m2 - c * c;
    const alpha1 = (m2 * f3 - c * f4) / det;
    const alpha2 = (-c * f3 + m1 * f4) / det;
    
    // Update velocities and angles (Euler integration)
    // Angles can wrap around 360 degrees - no need to normalize since sin/cos are periodic
    const newOmega1 = omega1 + alpha1 * dt;
    const newOmega2 = omega2 + alpha2 * dt;
    const newTheta1 = theta1 + newOmega1 * dt;
    const newTheta2 = theta2 + newOmega2 * dt;
    
    setOmega1(newOmega1);
    setOmega2(newOmega2);
    setTheta1(newTheta1);
    setTheta2(newTheta2);

    // Update visual representation
    // Calculate unit vectors for pendulum rods
    const x1 = Math.sin(newTheta1);
    const y1 = -Math.cos(newTheta1);
    const x2 = Math.sin(newTheta2);
    const y2 = -Math.cos(newTheta2);
    
    // Calculate pivot position along rod1 based on pivotPosition parameter
    // pivotPosition: 0 = at apex (basePivot), 1 = at end of rod1
    // The pivot moves along rod1 in the direction of theta1
    const pivotOffset = pivotPosition * rod1Length;
    const pivotX = basePivotX + pivotOffset * x1;
    const pivotY = basePivotY + pivotOffset * y1;
    
    // First rod: positioned at pivot, extends in direction of theta1
    if (rod1Ref.current) {
      // Rod center is at pivot + half rod length in the direction of theta1
      const rod1CenterX = pivotX + (0.5 * rod1Length) * x1;
      const rod1CenterY = pivotY + (0.5 * rod1Length) * y1;
      rod1Ref.current.position.set(rod1CenterX, rod1CenterY, 0);
      rod1Ref.current.rotation.z = newTheta1;
    }

    // Second rod: attaches to adjustable position along first rod, with adjustable pivot along its own length
    if (rod2Ref.current) {
      // Calculate where rod 2 attaches to rod 1
      // rod2AttachmentPosition: 0 = at rod 1's pivot, 1 = at end of rod 1
      const attachmentDistance = rod2AttachmentPosition * rod1Length;
      const rod2AttachmentX = pivotX + attachmentDistance * x1;
      const rod2AttachmentY = pivotY + attachmentDistance * y1;
      
      // Calculate the pivot point along rod 2's length
      // rod2PivotPosition: 0 = at attachment point (where rod 2 connects to rod 1), 1 = at end of rod 2
      const rod2PivotOffset = rod2PivotPosition * rod2Length;
      const rod2PivotX = rod2AttachmentX + rod2PivotOffset * x2;
      const rod2PivotY = rod2AttachmentY + rod2PivotOffset * y2;
      
      // Position rod 2's center relative to its pivot point
      // The rod extends from the pivot point, so center is at pivot + half length in direction of theta2
      const rod2CenterX = rod2PivotX + (0.5 * rod2Length) * x2;
      const rod2CenterY = rod2PivotY + (0.5 * rod2Length) * y2;
      
      rod2Ref.current.position.set(rod2CenterX, rod2CenterY, 0);
      rod2Ref.current.rotation.z = newTheta2;
    }
  });

  // Silver metallic material
  const silverMaterial = {
    color: '#C0C0C0',
    roughness: 0.2,
    metalness: 0.95,
    envMapIntensity: 1.2,
  };

  // Black matte base material
  const blackMaterial = {
    color: '#000000',
    roughness: 0.9,
    metalness: 0.1,
  };

  return (
    <group>
      {/* Black Rectangular Base */}
      <mesh position={[0, baseY, 0]} castShadow receiveShadow>
        <boxGeometry args={[baseWidth, baseHeight, baseDepth]} />
        <meshStandardMaterial {...blackMaterial} />
      </mesh>

      {/* Left Angled Support - slants inward from left edge to apex */}
      <mesh 
        position={[
          (-baseSpacing + (-apexHalfSpacing)) / 2,
          (baseY + apexY) / 2,
          0
        ]}
        rotation={[0, 0, leftSupportAngle]}
        castShadow 
        receiveShadow
      >
        <cylinderGeometry args={[rodThickness, rodThickness, leftSupportLength, 16]} />
        <meshStandardMaterial {...silverMaterial} />
      </mesh>

      {/* Right Angled Support - slants inward from right edge to apex */}
      <mesh 
        position={[
          (baseSpacing + apexHalfSpacing) / 2,
          (baseY + apexY) / 2,
          0
        ]}
        rotation={[0, 0, rightSupportAngle]}
        castShadow 
        receiveShadow
      >
        <cylinderGeometry args={[rodThickness, rodThickness, rightSupportLength, 16]} />
        <meshStandardMaterial {...silverMaterial} />
      </mesh>

      {/* First Pendulum Rod (Longer, heavier) */}
      <group ref={rod1Ref}>
        <mesh 
          castShadow 
          receiveShadow
        >
          <cylinderGeometry args={[rodThickness, rodThickness, rod1Length, 16]} />
          <meshStandardMaterial {...silverMaterial} />
        </mesh>
      </group>

      {/* Second Pendulum Rod (Shorter, lighter) */}
      <group ref={rod2Ref}>
        <mesh 
          castShadow 
          receiveShadow
        >
          <cylinderGeometry args={[rodThickness * 0.8, rodThickness * 0.8, rod2Length, 16]} />
          <meshStandardMaterial {...silverMaterial} />
        </mesh>
      </group>
    </group>
  );
}
