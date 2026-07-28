import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text, Float } from '@react-three/drei';

function MoleculeModel() {
  const group = useRef();
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = t * 0.5;
    group.current.rotation.x = Math.sin(t * 0.5) * 0.2;
  });

  return (
    <group ref={group}>
      {/* Central Atom (Oxygen) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshPhysicalMaterial color="#ef4444" roughness={0.1} transmission={0.9} thickness={1} ior={1.5} />
      </mesh>
      
      {/* Hydrogen 1 */}
      <mesh position={[-1, -0.6, 0.5]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
      </mesh>
      
      {/* Hydrogen 2 */}
      <mesh position={[1, -0.6, -0.5]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Bonds */}
      <mesh position={[-0.5, -0.3, 0.25]} rotation={[0, -0.5, 0.6]}>
        <cylinderGeometry args={[0.1, 0.1, 1.2]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      
      <mesh position={[0.5, -0.3, -0.25]} rotation={[0, 0.5, -0.6]}>
        <cylinderGeometry args={[0.1, 0.1, 1.2]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </group>
  );
}

function PHMeterModel({ value = 7 }) {
  const group = useRef();
  
  // Determine color based on pH value
  let liquidColor = '#22c55e'; // neutral green
  if (value < 7) liquidColor = '#ef4444'; // acidic red
  if (value > 7) liquidColor = '#3b82f6'; // basic blue

  useFrame((state) => {
    group.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.3;
  });

  return (
    <group ref={group} position={[0, -1, 0]}>
      {/* Flask Base */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1, 1.5, 2, 32]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.95} opacity={1} transparent roughness={0} ior={1.5} thickness={0.5} />
      </mesh>
      
      {/* Flask Neck */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.5, 1, 1, 32]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.95} opacity={1} transparent roughness={0} ior={1.5} thickness={0.5} />
      </mesh>

      {/* Liquid inside */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.95, 1.45, 1.8, 32]} />
        <meshPhysicalMaterial color={liquidColor} transmission={0.8} opacity={0.9} transparent roughness={0.1} />
      </mesh>
      
      <Text position={[0, 3, 0]} fontSize={0.5} color="#1e293b" anchorX="center" anchorY="middle">
        pH: {value}
      </Text>
    </group>
  );
}

export default function Explainer3D({ type = 'molecule', data = {} }) {
  return (
    <div style={{ width: '100%', height: '300px', background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          {type === 'molecule' && <MoleculeModel />}
          {type === 'ph' && <PHMeterModel value={data.pH || 7} />}
          {/* Fallback to molecule if type is unknown */}
          {type !== 'molecule' && type !== 'ph' && <MoleculeModel />}
        </Float>

        <Environment preset="city" />
        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2} far={4} />
        <OrbitControls enableZoom={false} autoRotate={type === 'ph'} autoRotateSpeed={1} />
      </Canvas>
    </div>
  );
}
