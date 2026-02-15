import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo } from "react";

const BASE_BRIGHTNESS = 1.75;
const BASE_CONTRAST = 0.6;
const SKY_GEOM = new THREE.SphereGeometry(1, 32, 32);

export default function Skybox({ postEffectsEnabled = false }) {
    const { gl } = useThree();
    const texture = useTexture("/textures/starmap.png", (t) => {
        t.anisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 4);
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.needsUpdate = true;
    });

    const brightness = postEffectsEnabled
        ? BASE_BRIGHTNESS * 1.8
        : BASE_BRIGHTNESS;
    const contrast = postEffectsEnabled ? BASE_CONTRAST * 1.8 : BASE_CONTRAST;

    const uniforms = useMemo(
        () => ({
            uTexture: { value: texture },
            uBrightness: { value: brightness },
            uContrast: { value: contrast },
        }),
        [texture, brightness, contrast]
    );

    return (
        <mesh geometry={SKY_GEOM} frustumCulled={false} renderOrder={-10}>
            <shaderMaterial
                side={THREE.BackSide}
                depthWrite={false}
                depthTest={false}
                toneMapped={false}
                uniforms={uniforms}
                vertexShader={`
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        mat4 viewVar = mat4(mat3(viewMatrix));
                        gl_Position = projectionMatrix * viewVar * modelMatrix * vec4(position, 1.0);
                        gl_Position.z = gl_Position.w; // Ensure it stays behind everything
                    }
                `}
                fragmentShader={`
                    uniform sampler2D uTexture;
                    uniform float uBrightness;
                    uniform float uContrast;
                    varying vec2 vUv;
                    void main() {
                        vec3 tex = texture2D(uTexture, vUv).rgb;
                        vec3 color = pow(tex, vec3(uContrast)) * uBrightness;
                        gl_FragColor = vec4(smoothstep(0.0, 1.0, color), 1.0);
                    }
                `}
            />
        </mesh>
    );
}
