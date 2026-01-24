import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function SmoothZoom({ 
  controlsRef, 
  sensitivity, 
  decay, 
  minDistance, 
  maxDistance
}) {
  const { gl, camera, mouse, raycaster } = useThree();
  const zoomVelocity = useRef(0);
  const zoomTarget = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    const el = gl.domElement;
    function onWheel(e) {
      if (!controlsRef.current) return;
      e.preventDefault();
      
      zoomVelocity.current += e.deltaY * sensitivity;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(state.scene.children, true);
      if (intersects.length > 0) {
        zoomTarget.current.lerp(intersects[0].point, 0.2);
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl, camera, mouse, raycaster, sensitivity, controlsRef]);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (Math.abs(zoomVelocity.current) > 0.0001) {
      const zoomFactor = 1 + (zoomVelocity.current * Math.min(delta * 60, 1));
      const camera = state.camera;
      
      const offset = camera.position.clone().sub(controls.target);
      offset.multiplyScalar(zoomFactor);
      
      const dist = offset.length();
      if (dist < minDistance) offset.setLength(minDistance);
      if (dist > maxDistance) offset.setLength(maxDistance);

      camera.position.copy(controls.target).add(offset);

      if (zoomVelocity.current < 0) {
        controls.target.lerp(zoomTarget.current, 0.05);
      } else {
        controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
      }

      const frameDecay = Math.pow(decay, delta * 60);
      zoomVelocity.current *= frameDecay;
      
      controls.update();
    } else {
      zoomVelocity.current = 0;
    }
  });

  return null;
}