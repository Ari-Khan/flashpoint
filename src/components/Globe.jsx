import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import perfCfg from "../config/settings.js";

export default function Globe({ textureName }) {
    const texName = textureName || perfCfg.texture || "specular.avif";
    const earthTexture = useTexture(`/textures/${texName}`);
    
    const geometry = useMemo(() => new THREE.SphereGeometry(1, 48, 48), []);

    return (
        <mesh geometry={geometry} renderOrder={1}>
            <meshStandardMaterial
                map={earthTexture}
                roughness={0.7}
                metalness={0.0}
                emissive="#000000"
                transparent={false}
                depthWrite={true}
            />
        </mesh>
    );
}