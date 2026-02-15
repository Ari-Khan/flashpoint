import * as THREE from "three";
import { useMemo } from "react";

const vertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vNormal;
  uniform vec3 color;
  void main() {
    float intensity = pow(0.7 - vNormal.z, 5.0);
    gl_FragColor = vec4(color, intensity);
  }
`;

export default function Atmosphere({ radius = 1 }) {
    const uniforms = useMemo(
        () => ({
            color: { value: new THREE.Color("#88ccff") },
        }),
        []
    );

    return (
        <mesh scale={1.2}>
            <sphereGeometry args={[radius, 32, 32]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
    );
}
