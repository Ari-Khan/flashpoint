import * as THREE from "three";

export default function Atmosphere({ radius = 1 }) {
    return (
        <mesh scale={1.1}>
            <sphereGeometry args={[radius, 64, 64]} />
            <meshPhongMaterial
                color="#4da6ff"
                transparent
                opacity={0.25}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
    );
}
