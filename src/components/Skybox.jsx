import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useRef, useLayoutEffect, useEffect } from "react";

const BASE_BRIGHTNESS = 1.75;
const BASE_CONTRAST = 0.6;

export default function Skybox({ postEffectsEnabled = false }) {
    const skyRef = useRef();
    const materialRef = useRef();
    const texture = useTexture("/textures/starmap.png");
    const { gl } = useThree();
    const brightness = postEffectsEnabled ? BASE_BRIGHTNESS * 1.8 : BASE_BRIGHTNESS;
    const contrast = postEffectsEnabled ? BASE_CONTRAST * 1.8 : BASE_CONTRAST;

    useLayoutEffect(() => {
        const tex = texture;
        tex.anisotropy =
            (gl.capabilities &&
                gl.capabilities.getMaxAnisotropy &&
                gl.capabilities.getMaxAnisotropy()) ||
            16;
    }, [texture, gl]);

    useFrame((state) => {
        if (skyRef.current) {
            skyRef.current.position.copy(state.camera.position);
        }
    });

    useEffect(() => {
        if (!materialRef.current) return;
        materialRef.current.uniforms.uBrightness.value = brightness;
        materialRef.current.uniforms.uContrast.value = contrast;
        materialRef.current.uniformsNeedUpdate = true;
    }, [brightness, contrast]);

    return (
        <mesh ref={skyRef} frustumCulled={false} renderOrder={-1}>
            <sphereGeometry args={[500, 64, 64]} />
            <shaderMaterial
                key={postEffectsEnabled ? "fx-on" : "fx-off"}
                ref={materialRef}
                side={THREE.BackSide}
                depthWrite={false}
                depthTest={false}
                toneMapped={false}
                uniforms={{
                    uTexture: { value: texture },
                    uBrightness: { value: brightness },
                    uContrast: { value: contrast },
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
