import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, ContactShadows } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";

type Item = { pos: [number, number, number]; color: string; scale: number };
const ITEMS: Item[] = [
  { pos: [-2.0, 0.5, 0], color: "#65704c", scale: 0.95 },
  { pos: [0.1, 1.0, -0.7], color: "#efe4c6", scale: 1.2 },
  { pos: [2.0, 0.25, 0.2], color: "#315f74", scale: 0.85 },
  { pos: [-1.0, -0.8, 0.9], color: "#9e2f2b", scale: 0.72 },
  { pos: [1.25, -0.7, -0.5], color: "#b06d24", scale: 0.78 },
];

function Crate({ pos, color, scale }: Item) {
  return (
    <Float speed={2} rotationIntensity={1.1} floatIntensity={1.5}>
      <RoundedBox args={[1, 1, 1]} radius={0.15} smoothness={4} position={pos} scale={scale}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.38} />
      </RoundedBox>
    </Float>
  );
}

function Rig() {
  const g = useRef<Group>(null);
  useFrame((s) => {
    if (g.current) g.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.16) * 0.55;
  });
  return <group ref={g}>{ITEMS.map((it, i) => <Crate key={i} {...it} />)}</group>;
}

export function Showroom3D() {
  return (
    <Canvas camera={{ position: [0, 0.6, 6.2], fov: 42 }} dpr={[1, 1.8]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 7, 5]} intensity={1.5} />
      <directionalLight position={[-5, 2, -3]} intensity={0.6} color="#9e2f2b" />
      <pointLight position={[0, -2, 3]} intensity={0.4} color="#315f74" />
      <Rig />
      <ContactShadows position={[0, -1.7, 0]} opacity={0.35} scale={14} blur={2.8} far={4.5} />
    </Canvas>
  );
}
