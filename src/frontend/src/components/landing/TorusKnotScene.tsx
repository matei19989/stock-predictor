import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import type { Mesh } from 'three';

function RotatingKnot() {
  const ref = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.18;
    ref.current.rotation.x += delta * 0.08;
  });

  return (
    <Float speed={1.5} floatIntensity={0.35} rotationIntensity={0}>
      <mesh ref={ref}>
        <torusKnotGeometry args={[2.2, 0.5, 200, 20, 3, 4]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#7c3aed"
          emissiveIntensity={0.25}
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
    </Float>
  );
}

export default function TorusKnotScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 50 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#a855f7" />
      <pointLight position={[-5, -3, 5]} intensity={0.5} color="#ec4899" />
      <RotatingKnot />
    </Canvas>
  );
}
