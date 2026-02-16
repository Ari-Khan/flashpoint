import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useMemo } from "react";

const GEOM = new THREE.SphereGeometry(1, 32, 32);

export default function Skybox({ postEffectsEnabled = false }) {
    const texture = useTexture("/textures/starmap.png");
    
    useMemo(() => {
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
    }, [texture]);

    const brightness = postEffectsEnabled ? 3.15 : 1.75;
    const contrast = postEffectsEnabled ? 1.08 : 0.6;

    const uniforms = useMemo(() => ({
        uTexture: { value: texture },
        uBrightness: { value: 0 },
        uContrast: { value: 0 },
    }), [texture]);

    uniforms.uBrightness.value = brightness;
    uniforms.uContrast.value = contrast;

    return (
        <mesh geometry={GEOM} frustumCulled={false} renderOrder={-100}>
            <shaderMaterial
                side={THREE.BackSide}
                depthWrite={false}
                toneMapped={false}
                uniforms={uniforms}
                vertexShader={`
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        mat4 viewOnlyRotation = mat4(mat3(viewMatrix));
                        gl_Position = projectionMatrix * viewOnlyRotation * modelMatrix * vec4(position, 1.0);
                        gl_Position.z = gl_Position.w; 
                    }
                `}
                fragmentShader={`
                    uniform sampler2D uTexture;
                    uniform float uBrightness;
                    uniform float uContrast;
                    varying vec2 vUv;
                    void main() {
                        vec3 color = pow(texture2D(uTexture, vUv).rgb, vec3(uContrast)) * uBrightness;
                        gl_FragColor = vec4(color, 1.0);
                    }
                `}
            />
        </mesh>
    );
}