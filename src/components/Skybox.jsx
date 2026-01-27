import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useRef, useLayoutEffect } from "react";

export default function Skybox() {
    const skyRef = useRef();
    const texture = useTexture("/textures/starmap.png");
    const { gl, scene } = useThree();

    useLayoutEffect(() => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = (gl.capabilities && gl.capabilities.getMaxAnisotropy && gl.capabilities.getMaxAnisotropy()) || 16;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.needsUpdate = true;

        // Set as scene background for stable sampling
        if (scene) scene.background = texture;

        return () => {
            if (scene && scene.background === texture) scene.background = null;
        };
    }, [texture, gl, scene]);

    useFrame((state) => {
        if (skyRef.current) {
            skyRef.current.position.copy(state.camera.position);
        }
    });

    return (
        <mesh ref={skyRef} frustumCulled={false} renderOrder={-1}>
            <sphereGeometry args={[500, 64, 64]} />
            <shaderMaterial
                side={THREE.BackSide}
                depthWrite={false}
                depthTest={false}
                toneMapped={false}
                uniforms={{
                    uTexture: { value: texture },
                    uBrightness: { value: 2.25 },
                    uContrast: { value: 0.35 },
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
