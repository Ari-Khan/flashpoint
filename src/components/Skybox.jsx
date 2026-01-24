import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useRef } from "react";

export default function Skybox() {
    const { scene, camera } = useThree();
    const skyboxRef = useRef();

    useEffect(() => {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load("/textures/starmap.png");

        const geometry = new THREE.SphereGeometry(100, 64, 64);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide,
        });
        const skybox = new THREE.Mesh(geometry, material);
        skyboxRef.current = skybox;

        scene.add(skybox);

        return () => {
            scene.remove(skybox);
            geometry.dispose();
            material.dispose();
            texture.dispose();
        };
    }, [scene, camera]);

    useFrame(() => {
        if (skyboxRef.current) skyboxRef.current.position.copy(camera.position);
    });

    return null;
}
