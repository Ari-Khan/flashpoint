import { Sphere, useTexture } from "@react-three/drei";
import * as THREE from "three";

export default function Globe({ textureName = "specular.png" }) {
    const earthTexture = useTexture(`/textures/${textureName}`);

    return (
        <Sphere args={[1, 64, 64]}>
            <meshStandardMaterial
                map={earthTexture}
                roughness={0.8}
                metalness={0.1}
                transparent={false}
                depthWrite={true}
                renderOrder={1} 
            />
        </Sphere>
    );
}