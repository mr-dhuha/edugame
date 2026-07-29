import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function Ocean() {
  const geomRef = useRef();
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    timeRef.current += delta * 1.2;
    const time = timeRef.current;
    if (geomRef.current) {
      const pos = geomRef.current.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        // Kombinasi gelombang arah X dan Y untuk efek laut nyata (rolling waves)
        const wave1 = Math.sin(x * 0.15 + time) * 0.6;
        const wave2 = Math.cos(y * 0.15 + time * 0.8) * 0.6;
        const wave3 = Math.sin((x + y) * 0.1 - time * 0.5) * 0.3;
        pos.setZ(i, wave1 + wave2 + wave3);
      }
      pos.needsUpdate = true;
      geomRef.current.computeVertexNormals();
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -15]}>
      <planeGeometry ref={geomRef} args={[100, 100, 50, 50]} />
      <meshStandardMaterial 
        color="#00a8ff" 
        roughness={0.2} 
        metalness={0.2} 
        flatShading={true} // Memberi efek kartun / low poly dynamic
      />
    </mesh>
  );
}

export default function SeaBackground() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, background: 'linear-gradient(to bottom, #4fc3f7, #0288d1)' }}>
      <Canvas camera={{ position: [0, 12, 10], fov: 60 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 5]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-10, 5, -5]} intensity={0.8} color="#7dd3fc" />
        
        {/* Ombak utama */}
        <Ocean />
      </Canvas>
    </div>
  );
}
