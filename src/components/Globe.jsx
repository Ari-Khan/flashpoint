import { Sphere, useTexture } from "@react-three/drei";
import * as THREE from "three";
import perfCfg from "../config/settings.js";

export default function Globe({ textureName }) {
    const texName = textureName || perfCfg.texture || "specular.avif";
    const earthTexture = useTexture(`/textures/${texName}`);

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