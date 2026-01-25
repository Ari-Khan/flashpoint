import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3.js";
import { getJitteredVec3 } from "../utils/jitter.js";

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
    const start = latLonToVec3(fromLat, fromLon, 1.001);
    const end = getJitteredVec3(Number(toLat), Number(toLon), 1.001, Number(startTime));
    const d = start.distanceTo(end);
    
    const seed = Number(startTime);
    const variance = (Math.sin(seed * 12.9898) * 0.03);
    const h = Math.max(0.1, -0.75 + (d * 0.85)) + variance;

    let mid = new THREE.Vector3().addVectors(start, end).normalize();
    if (start.dot(end) < -0.9) {
      const axis = Math.abs(start.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      mid = new THREE.Vector3().crossVectors(start, axis).normalize();
    }

    const startDir = start.clone().normalize();
    const endDir = end.clone().normalize();
    const ctrl1 = new THREE.Vector3().lerpVectors(startDir, mid, 0.5).normalize().multiplyScalar(1.001 + h);
    const ctrl2 = new THREE.Vector3().lerpVectors(endDir, mid, 0.5).normalize().multiplyScalar(1.001 + h);

    const cubicCurve = new THREE.CubicBezierCurve3(start, ctrl1, ctrl2, end);
    
    const approxLength = start.distanceTo(ctrl1) + ctrl1.distanceTo(ctrl2) + ctrl2.distanceTo(end);
    const dynamicSegments = Math.min(600, Math.max(40, Math.ceil(approxLength * 150)));
    
    const pts = cubicCurve.getPoints(dynamicSegments);
    const geom = new THREE.BufferGeometry().setFromPoints(pts);

    const arcLengths = new Float32Array(pts.length);
    let totalLen = 0;
    arcLengths[0] = 0;
    for (let i = 1; i < pts.length; i++) {
      totalLen += pts[i].distanceTo(pts[i - 1]);
      arcLengths[i] = totalLen;
    }
    if (totalLen > 0) {
      for (let i = 1; i < arcLengths.length; i++) arcLengths[i] /= totalLen;
    } else {
      for (let i = 1; i < arcLengths.length; i++) arcLengths[i] = i / (arcLengths.length - 1);
    }

    const speed = { icbm: 15, slbm: 18, air: 30 }[weapon] ?? 20;
    const dur = Math.max(5, d * speed);

    return { 
      geometry: geom, 
      curve: cubicCurve, 
      duration: dur,
      impactTime: startTime + dur,
      segments: dynamicSegments,
      arcLengths,
      pointsCount: pts.length
    };
  }, [fromLat, fromLon, toLat, toLon, startTime, weapon]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame(() => {
    if (!lineRef.current || !coneRef.current || isDoneRef.current) return;

    const t = THREE.MathUtils.clamp((currentTime - startTime) / duration, 0, 1);
    // ease-in for the first portion, then linear to maintain terminal velocity (no ease-out)
    const easeThreshold = 0.2; // fraction of duration to ease-in
    let progress;
    if (t < easeThreshold) {
      const local = t / easeThreshold; // 0..1
      progress = easeThreshold * (local * local); // quadratic ease-in mapped into [0, easeThreshold]
    } else {
      progress = t; // linear after ease-in
    }

    // map progress (0..1 in arc length) to curve parameter u (0..1) using precomputed arcLengths
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