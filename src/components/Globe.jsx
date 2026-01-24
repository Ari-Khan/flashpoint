import { Sphere, useTexture } from "@react-three/drei";

export default function Globe({ textureName = "topography.jpg" }) {
    const earthTexture = useTexture(`/textures/${textureName}`);

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
