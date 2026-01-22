import { Sphere, useTexture } from "@react-three/drei";

export default function Globe() {
  const earthTexture = useTexture("/textures/earth.png");

  return (
    <Sphere args={[1, 64, 64]}>
      <meshStandardMaterial
        map={earthTexture}
        roughness={0.8}
        metalness={0.1}
      />
    </Sphere>
  );
}
