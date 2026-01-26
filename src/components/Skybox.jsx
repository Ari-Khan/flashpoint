import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRef, useLayoutEffect } from "react";

export default function Skybox() {
    const skyRef = useRef();
    const texture = useTexture("/textures/starmap.png");

    useLayoutEffect(() => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true; 
        texture.anisotropy = 16;
        texture.needsUpdate = true;
    }, [texture]);

    useFrame((state) => {
        if (skyRef.current) {
            skyRef.current.position.copy(state.camera.position);
        }
    });

    return (
        <mesh ref={skyRef} frustumCulled={false} renderOrder={-1}>
            <sphereGeometry args={[64, 64, 64]} />
            <shaderMaterial
                side={THREE.BackSide}
                depthWrite={false}
                toneMapped={false}
                uniforms={{
                    uTexture: { value: texture },
                    uBrightness: { value: 2.25 },
                    uContrast: { value: 0.35 }
                }}
                vertexShader={`
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `}
                fragmentShader={`
                    uniform sampler2D uTexture;
                    uniform float uBrightness;
                    uniform float uContrast;
                    varying vec2 vUv;
                    void main() {
                        vec4 texColor = texture2D(uTexture, vUv);
                        
                        vec3 color = pow(texColor.rgb, vec3(uContrast));
                        
                        vec3 cleanColor = smoothstep(0.0, 1.0, color);
                        
                        gl_FragColor = vec4(cleanColor * uBrightness, 1.0);
                    }
                `}
            />
        </mesh>
    );
}