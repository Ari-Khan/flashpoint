import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { computeTrajectory, buildCubicCurveAndGeometry } from "../utils/trajectory.js";

const UP_AXIS = new THREE.Vector3(0, 1, 0);

export default function Arc({
  id,
  fromLat,
  fromLon,
  toLat,
  toLon,
  weapon,
  startTime,
  currentTime,
  onComplete
}) {
  const lineRef = useRef();
  const coneRef = useRef();
  const isDoneRef = useRef(false);
  const tempVec = useRef(new THREE.Vector3()).current;

  const { geometry, curve, duration, impactTime, segments, arcLengths, pointsCount } = useMemo(() => {
    const { start, end, distance, duration: dur, impactTick } = computeTrajectory({ fromLat, fromLon, toLat, toLon, startTime, weapon });
    const { curve: cubicCurve, geometry: geom, arcLengths, pointsCount, segments } = buildCubicCurveAndGeometry({ start, end, startTime });

    return {
      geometry: geom,
      curve: cubicCurve,
      duration: dur,
      impactTime: impactTick,
      segments,
      arcLengths,
      pointsCount
    };
  }, [fromLat, fromLon, toLat, toLon, startTime, weapon]);

  useEffect(() => {
    return () => {
      try { geometry.dispose(); } catch (e) {}
      try { if (lineRef.current && lineRef.current.material) lineRef.current.material.dispose(); } catch (e) {}
      try {
        if (coneRef.current) {
          if (coneRef.current.material) coneRef.current.material.dispose();
          if (coneRef.current.geometry) coneRef.current.geometry.dispose();
        }
      } catch (e) {}
    };
  }, [geometry]);

  useFrame(() => {
    if (!lineRef.current || !coneRef.current || isDoneRef.current) return;

    const t = THREE.MathUtils.clamp((currentTime - startTime) / duration, 0, 1);
    const easeThreshold = 0.2;
    let progress;
    if (t < easeThreshold) {
      const local = t / easeThreshold;
      progress = easeThreshold * (local * local);
    } else {
      progress = t;
    }

    let u = progress;
    if (arcLengths && arcLengths.length > 1) {
      if (progress <= 0) u = 0;
      else if (progress >= 1) u = 1;
      else {
        let low = 0, high = arcLengths.length - 1;
        while (low < high) {
          const mid = (low + high) >> 1;
          if (arcLengths[mid] < progress) low = mid + 1;
          else high = mid;
        }
        const i = Math.max(0, low - 1);
        const startArc = arcLengths[i];
        const endArc = arcLengths[i + 1];
        const local = (progress - startArc) / (endArc - startArc || 1);
        u = (i + local) / (arcLengths.length - 1);
      }
    }

    const drawCount = Math.ceil(u * (pointsCount - 1));
    lineRef.current.geometry.setDrawRange(0, drawCount);

    if (progress < 1) {
      curve.getPoint(u, coneRef.current.position);
      curve.getTangent(u, tempVec);
      coneRef.current.quaternion.setFromUnitVectors(UP_AXIS, tempVec.normalize());
      if (!coneRef.current.visible) coneRef.current.visible = true;
    } else {
      coneRef.current.visible = false;
    }

    const fadeStart = impactTime;
    if (currentTime >= fadeStart) {
      const opacity = Math.max(0, 1 - (currentTime - fadeStart) * 5);
      lineRef.current.material.opacity = opacity;
      coneRef.current.material.opacity = opacity;

      if (opacity <= 0) {
        isDoneRef.current = true;
        onComplete(id);
      }
    }
  });

  return (
    <group>
      <line ref={lineRef} geometry={geometry}>
        <lineBasicMaterial color="#ff5533" transparent opacity={1} depthWrite={false} />
      </line>
      <mesh ref={coneRef} visible={false}>
        <coneGeometry args={[0.003, 0.01, 8]} />
        <meshBasicMaterial color="#ff5533" transparent opacity={1} depthWrite={false} />
      </mesh>
    </group>
  );
}