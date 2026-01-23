import { Sphere, useTexture } from "@react-three/drei";

export default function Globe() {
    const earthTexture = useTexture("/textures/earth.png");

    return (
        <Sphere args={[1, 48, 48]}>
            <meshStandardMaterial
                map={earthTexture}
                roughness={0.8}
                metalness={0.1}
            />
        </Sphere>
    );
}
