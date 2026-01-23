import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect } from "react";

export default function Skybox() {
    const { scene, camera } = useThree();

    useEffect(() => {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load("/textures/starmap.png");

        const geometry = new THREE.SphereGeometry(100, 64, 64);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide,
        });
        const skybox = new THREE.Mesh(geometry, material);

        scene.add(skybox);

        const updateSkybox = () => {
            skybox.position.copy(camera.position);
        };

        const originalUpdateWorldMatrix = camera.updateWorldMatrix.bind(camera);
        camera.updateWorldMatrix = function (...args) {
            originalUpdateWorldMatrix(...args);
            updateSkybox();
        };

        return () => {
            scene.remove(skybox);
            geometry.dispose();
            material.dispose();
            texture.dispose();
        };
    }, [scene, camera]);

    return null;
}
