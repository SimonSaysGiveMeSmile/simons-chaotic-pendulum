'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls, button } from 'leva';
import * as THREE from 'three';

type ViewMode = 'free' | 'positionFix';

interface PendulumProps {
  mode: ViewMode;
}

export default function Pendulum({ mode }: PendulumProps) {
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
    rod1Mass,
    rod2Mass,
    simulationSpeed,
  } = useControls('Pendulum Settings', {
    simulationSpeed: { value: 1.0, min: 0.1, max: 10, step: 0.1, label: '⏱️ Simulation Speed' },
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
    rod1MomentumBoost: { value: 1, min: 0, max: 5, step: 0.1, label: 'Rod 1 Momentum Boost' },
    rod1Mass: { value: 5, min: 0.1, max: 20, step: 0.1, label: '⚖️ Rod 1 Mass' },
    rod2Mass: { value: 5, min: 0.1, max: 20, step: 0.1, label: '⚖️ Rod 2 Mass' },
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
  const rod1MeshRef = useRef<THREE.Mesh>(null);
  const rod2MeshRef = useRef<THREE.Mesh>(null);
  const { camera, raycaster, gl } = useThree();
  
  // Pointer interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedRod, setDraggedRod] = useState<1 | 2 | null>(null);
  const pointerRef = useRef(new THREE.Vector2());
  const mouseDownRef = useRef(false);

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

  // Helper function to calculate derivatives for the double pendulum equations
  // Using proper Lagrangian mechanics for a double pendulum with length and mass
  const calculateDerivatives = (t1: number, t2: number, w1: number, w2: number) => {
    const g = gravity;
    const m1 = rod1Mass; // Mass of first pendulum (adjustable)
    const m2 = rod2Mass; // Mass of second pendulum (adjustable)
    const L1 = rod1Length; // Length of first rod
    const L2 = rod2Length; // Length of second rod
    
    const c = Math.cos(t1 - t2);
    const s = Math.sin(t1 - t2);
    
    // Proper double pendulum equations with length dependencies
    // These equations come from the Lagrangian of a double pendulum system
    // accounting for the distributed mass and actual rod lengths
    
    const denominator1 = (m1 + m2) * L1 - m2 * L1 * c * c;
    const denominator2 = (L2 / L1) * denominator1;
    
    // Angular accelerations with proper length scaling and nonlinear coupling
    // Note: These are the full equations for a double pendulum with point masses at the ends
    const alpha1 = (
      m2 * L1 * w1 * w1 * s * c +
      m2 * g * Math.sin(t2) * c +
      m2 * L2 * w2 * w2 * s -
      (m1 + m2) * g * Math.sin(t1) +
      rod1MomentumBoost // Momentum boost to help overcome initial inertia
    ) / denominator1;
    
    const alpha2 = (
      -m2 * L2 * w2 * w2 * s * c +
      (m1 + m2) * (g * Math.sin(t1) * c - L1 * w1 * w1 * s - g * Math.sin(t2))
    ) / denominator2;
    
    return {
      dTheta1: w1,
      dTheta2: w2,
      dOmega1: alpha1,
      dOmega2: alpha2
    };
  };

  // Set up global pointer event handlers for dragging rods in position fix mode
  useEffect(() => {
    if (mode !== 'positionFix') {
      gl.domElement.style.cursor = 'default';
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return; // Only left mouse button
      
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      pointerRef.current.set(x, y);
      
      // Raycast to detect which rod is clicked
      raycaster.setFromCamera(pointerRef.current, camera);
      const rod1Intersects = rod1MeshRef.current ? raycaster.intersectObject(rod1MeshRef.current) : [];
      const rod2Intersects = rod2MeshRef.current ? raycaster.intersectObject(rod2MeshRef.current) : [];
      
      if (rod1Intersects.length > 0) {
        mouseDownRef.current = true;
        setIsDragging(true);
        setDraggedRod(1);
        gl.domElement.style.cursor = 'grabbing';
        event.preventDefault();
      } else if (rod2Intersects.length > 0) {
        mouseDownRef.current = true;
        setIsDragging(true);
        setDraggedRod(2);
        gl.domElement.style.cursor = 'grabbing';
        event.preventDefault();
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      pointerRef.current.set(x, y);
      
      if (mouseDownRef.current && isDragging && draggedRod) {
        // Create a plane at z=0 for intersection
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        raycaster.setFromCamera(pointerRef.current, camera);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);
        
        if (draggedRod === 1) {
          // Calculate angle from pivot to intersection point
          const dx = intersection.x - basePivotX;
          const dy = intersection.y - basePivotY;
          const newAngle = Math.atan2(dx, -dy);
          setTheta1(newAngle);
          setOmega1(0);
        } else if (draggedRod === 2) {
          // For rod 2, calculate relative angle
          // First get the attachment point
          const x1 = Math.sin(theta1);
          const y1 = -Math.cos(theta1);
          const attachmentDistance = rod2AttachmentPosition * rod1Length;
          const rod2AttachmentX = basePivotX + attachmentDistance * x1;
          const rod2AttachmentY = basePivotY + attachmentDistance * y1;
          
          // Calculate angle from attachment point to intersection
          const dx = intersection.x - rod2AttachmentX;
          const dy = intersection.y - rod2AttachmentY;
          const absoluteAngle = Math.atan2(dx, -dy);
          const relativeAngle = absoluteAngle - theta1;
          setTheta2(relativeAngle);
          setOmega2(0);
        }
      } else {
        // Check for hover
        raycaster.setFromCamera(pointerRef.current, camera);
        const rod1Intersects = rod1MeshRef.current ? raycaster.intersectObject(rod1MeshRef.current) : [];
        const rod2Intersects = rod2MeshRef.current ? raycaster.intersectObject(rod2MeshRef.current) : [];
        
        if (!mouseDownRef.current) {
          if (rod1Intersects.length > 0 || rod2Intersects.length > 0) {
            gl.domElement.style.cursor = 'grab';
          } else {
            gl.domElement.style.cursor = 'default';
          }
        }
      }
    };

    const handleMouseUp = () => {
      mouseDownRef.current = false;
      setIsDragging(false);
      setDraggedRod(null);
      gl.domElement.style.cursor = 'default';
    };

    const canvas = gl.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [mode, isDragging, draggedRod, camera, raycaster, gl, basePivotX, basePivotY, theta1, rod2AttachmentPosition, rod1Length]);

  // Physics simulation using RK4 integration for stability at higher speeds
  useFrame((state, delta) => {
    // Skip physics for dragged rod in position fix mode
    const skipRod1Physics = mode === 'positionFix' && isDragging && draggedRod === 1;
    const skipRod2Physics = mode === 'positionFix' && isDragging && draggedRod === 2;
    
    // Limit delta to prevent instability, apply simulation speed
    const dt = Math.min(delta, 0.016) * simulationSpeed; // Cap at ~60fps equivalent
    
    // RK4 Integration for better accuracy
    // k1
    const k1 = calculateDerivatives(theta1, theta2, omega1, omega2);
    
    // k2
    const k2 = calculateDerivatives(
      theta1 + 0.5 * dt * k1.dTheta1,
      theta2 + 0.5 * dt * k1.dTheta2,
      omega1 + 0.5 * dt * k1.dOmega1,
      omega2 + 0.5 * dt * k1.dOmega2
    );
    
    // k3
    const k3 = calculateDerivatives(
      theta1 + 0.5 * dt * k2.dTheta1,
      theta2 + 0.5 * dt * k2.dTheta2,
      omega1 + 0.5 * dt * k2.dOmega1,
      omega2 + 0.5 * dt * k2.dOmega2
    );
    
    // k4
    const k4 = calculateDerivatives(
      theta1 + dt * k3.dTheta1,
      theta2 + dt * k3.dTheta2,
      omega1 + dt * k3.dOmega1,
      omega2 + dt * k3.dOmega2
    );
    
    // Combine all k values with RK4 weights
    const newTheta1 = skipRod1Physics ? theta1 : theta1 + (dt / 6) * (k1.dTheta1 + 2 * k2.dTheta1 + 2 * k3.dTheta1 + k4.dTheta1);
    const newTheta2 = skipRod2Physics ? theta2 : theta2 + (dt / 6) * (k1.dTheta2 + 2 * k2.dTheta2 + 2 * k3.dTheta2 + k4.dTheta2);
    const newOmega1 = skipRod1Physics ? omega1 : omega1 + (dt / 6) * (k1.dOmega1 + 2 * k2.dOmega1 + 2 * k3.dOmega1 + k4.dOmega1);
    const newOmega2 = skipRod2Physics ? omega2 : omega2 + (dt / 6) * (k1.dOmega2 + 2 * k2.dOmega2 + 2 * k3.dOmega2 + k4.dOmega2);
    
    setOmega1(newOmega1);
    setOmega2(newOmega2);
    setTheta1(newTheta1);
    setTheta2(newTheta2);

    // Update visual representation
    // Calculate unit vectors for pendulum rods
    const x1 = Math.sin(newTheta1);
    const y1 = -Math.cos(newTheta1);
    // Rod 2 angle should be relative to rod 1's angle (absolute angle in world space)
    const absoluteTheta2 = newTheta1 + newTheta2;
    const x2 = Math.sin(absoluteTheta2);
    const y2 = -Math.cos(absoluteTheta2);
    
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
      rod2Ref.current.rotation.z = absoluteTheta2;
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
          ref={rod1MeshRef}
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
          ref={rod2MeshRef}
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
