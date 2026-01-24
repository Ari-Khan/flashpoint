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
  const { gl } = useThree();
  const zoomVelocity = useRef(0);

  useEffect(() => {
    const el = gl.domElement;
    function onWheel(e) {
      if (!controlsRef.current) return;
      e.preventDefault();
      zoomVelocity.current += e.deltaY * sensitivity;
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl, sensitivity, controlsRef]);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (Math.abs(zoomVelocity.current) > 0.0001) {
      const zoomFactor = 1 + (zoomVelocity.current * Math.min(delta * 60, 1));
      const cam = state.camera;
      
      const offset = cam.position.clone().sub(controls.target);
      offset.multiplyScalar(zoomFactor);
      
      const dist = offset.length();
      if (dist < minDistance) offset.setLength(minDistance);
      if (dist > maxDistance) offset.setLength(maxDistance);

      cam.position.copy(controls.target).add(offset);

      const frameDecay = Math.pow(decay, delta * 60);
      zoomVelocity.current *= frameDecay;
      
      controls.update();
    } else {
      zoomVelocity.current = 0;
    }
  });

  return null;
}