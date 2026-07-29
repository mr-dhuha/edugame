import React from 'react';
import { Canvas } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';

function Ocean() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -15]}>
      <planeGeometry args={[100, 100, 40, 40]} />
      <MeshDistortMaterial
        color="#29b6f6" // Cerah laut tropis
        envMapIntensity={0.8}
        clearcoat={0.5}
        clearcoatRoughness={0.2}
        metalness={0.1}
        roughness={0.4}
        distort={0.4} // Tingkat gelombang
        speed={1.5}   // Kecepatan gelombang
        flatShading={true} // Memberi efek kartun / low poly
      />
    </mesh>
  );
}

export default function SeaBackground() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, background: 'linear-gradient(to bottom, #81d4fa, #e1f5fe)' }}>
      <Canvas camera={{ position: [0, 12, 10], fov: 60 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 5]} intensity={1.2} color="#fff8e1" />
        <directionalLight position={[-10, 5, -5]} intensity={0.5} color="#4fc3f7" />
        <Ocean />
      </Canvas>
    </div>
  );
}
