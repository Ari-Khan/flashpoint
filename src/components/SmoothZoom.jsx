import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export default function SmoothZoom({ 
  controlsRef, 
  sensitivity, 
  decay, 
  minDistance, 
  maxDistance,
  enabled
}) {
  const { gl } = useThree();
  const zoomVelocity = useRef(0);
  const pinchActive = useRef(false);
  const lastPinchDistance = useRef(0);

  useEffect(() => {
    window.__resetZoomVelocity = () => {
      zoomVelocity.current = 0;
    };
    return () => {
      delete window.__resetZoomVelocity;
    };
  }, []);

  useEffect(() => {
    const el = gl.domElement;

    function onWheel(e) {
      if (!enabled || !controlsRef.current) return;
      e.preventDefault();
      zoomVelocity.current += e.deltaY * sensitivity;
    }

    function getTouchDistance(t0, t1) {
      return Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
    }

    function onTouchStart(e) {
      if (!enabled || !controlsRef.current) return;
      if (e.touches && e.touches.length === 2) {
        pinchActive.current = true;
        lastPinchDistance.current = getTouchDistance(e.touches[0], e.touches[1]);
        e.preventDefault();
      }
    }

    function onTouchMove(e) {
      if (!pinchActive.current || !controlsRef.current) return;
      if (e.touches && e.touches.length === 2) {
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const delta = lastPinchDistance.current - dist;
        if (Math.abs(delta) > 0.5) {
          zoomVelocity.current += delta * (sensitivity * 10);
          lastPinchDistance.current = dist;
        }
        e.preventDefault();
      }
    }

    function endPinch() {
      pinchActive.current = false;
      lastPinchDistance.current = 0;
    }

    function onTouchEnd(e) {
      if (!enabled) return;
      if (!e.touches || e.touches.length < 2) endPinch();
    }

    const previousTouchAction = el.style.touchAction;
    if (enabled) el.style.touchAction = "none";

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", endPinch, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", endPinch);
      el.style.touchAction = previousTouchAction;
    };
  }, [gl, sensitivity, controlsRef, enabled]);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls || !enabled) return;

    if (Math.abs(zoomVelocity.current) > 0.0001) {
      const frameDelta = Math.min(delta * 60, 2);
      const zoomFactor = 1 + (zoomVelocity.current * frameDelta);
      const cam = state.camera;
      
      const offset = cam.position.clone().sub(controls.target);

      if (offset.length() < 0.001) {
        offset.set(0, 0, minDistance);
      }

      offset.multiplyScalar(zoomFactor);
      
      const dist = offset.length();
      
      if (dist < minDistance) {
        offset.setLength(minDistance);
        zoomVelocity.current = 0; 
      } else if (dist > maxDistance) {
        offset.setLength(maxDistance);
        zoomVelocity.current = 0;
      }

      cam.position.copy(controls.target).add(offset);
      zoomVelocity.current *= Math.pow(decay, frameDelta);
      
      controls.update();
    } else {
      zoomVelocity.current = 0;
    }
  });

  return null;
}