import * as THREE from "three";
import { useMemo } from "react";

const vertexShader = `
  varying vec3 vNormal;
  varying float vDistance;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    vDistance = length(mvPosition.xyz);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vNormal;
  varying float vDistance;
  uniform vec3 color;
  void main() {
    float viewDot = vNormal.z;
    float intensity = pow(0.5 - viewDot, 5.0);
    float distanceFactor = 15.0 / pow(vDistance, 1.5);
    
    gl_FragColor = vec4(color, intensity * distanceFactor);
  }
`;

export default function Atmosphere({ radius = 1 }) {
    const uniforms = useMemo(() => ({
        color: { value: new THREE.Color("#88ccff") }
    }), []);

    return (
        <mesh scale={1.2}>
            <sphereGeometry args={[radius, 64, 64]} />
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