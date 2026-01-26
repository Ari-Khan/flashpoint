import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const _offset = new THREE.Vector3();

export default function SmoothZoom({
    controlsRef,
    sensitivity = 0.001,
    decay = 0.9,
    minDistance = 1.1,
    maxDistance = 10,
    enabled = true,
}) {
    const { gl, camera } = useThree();
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
        if (!el) return;

        const onWheel = (e) => {
            if (!enabled || !controlsRef.current) return;
            e.preventDefault();
            zoomVelocity.current += e.deltaY * sensitivity;
        };

        const getDist = (t0, t1) =>
            Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);

        const onTouchStart = (e) => {
            if (enabled && e.touches?.length === 2) {
                pinchActive.current = true;
                lastPinchDistance.current = getDist(e.touches[0], e.touches[1]);
            }
        };

        const onTouchMove = (e) => {
            if (enabled && pinchActive.current && e.touches?.length === 2) {
                const dist = getDist(e.touches[0], e.touches[1]);
                const delta = lastPinchDistance.current - dist;
                zoomVelocity.current += delta * sensitivity * 2;
                lastPinchDistance.current = dist;
                if (e.cancelable) e.preventDefault();
            }
        };

        const endPinch = () => {
            pinchActive.current = false;
        };

        el.addEventListener("wheel", onWheel, { passive: false });
        el.addEventListener("touchstart", onTouchStart, { passive: false });
        el.addEventListener("touchmove", onTouchMove, { passive: false });
        el.addEventListener("touchend", endPinch);
        el.addEventListener("touchcancel", endPinch);

        return () => {
            el.removeEventListener("wheel", onWheel);
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
            el.removeEventListener("touchend", endPinch);
            el.removeEventListener("touchcancel", endPinch);
        };
    }, [gl, sensitivity, enabled, controlsRef]);

    useFrame((_, delta) => {
        const controls = controlsRef.current;
        if (!controls || !enabled || Math.abs(zoomVelocity.current) < 0.0001) {
            if (zoomVelocity.current !== 0) zoomVelocity.current = 0;
            return;
        }

        const frameDelta = Math.min(delta * 60, 2);
        const zoomFactor = 1 + zoomVelocity.current * frameDelta;

        _offset.copy(camera.position).sub(controls.target);

        let dist = _offset.length();
        if (dist <= 0) dist = minDistance;

        let newDist = dist * zoomFactor;
        newDist = Math.max(minDistance, Math.min(maxDistance, newDist));

        _offset.setLength(newDist);
        camera.position.copy(controls.target).add(_offset);

        if (newDist === minDistance || newDist === maxDistance) {
            zoomVelocity.current = 0;
        } else {
            zoomVelocity.current *= Math.pow(decay, frameDelta);
        }

        controls.update();
    });

    return null;
}
