import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3";
import { getJitteredVec3 } from "../utils/jitter";

function getArcHeight(distance) {
  const baseHeight = Math.pow(distance, 0.7) * 0.5;
  return Math.min(1.5, baseHeight); 
}

export default function Arc({
  fromLat,
  fromLon,
  toLat,
  toLon,
  weapon,
  startTime,
  currentTime,
}) {
  const lineRef = useRef();

  const { points, geometry, curve, distance } = useMemo(() => {
    const start = latLonToVec3(fromLat, fromLon, 1.001);
    
    const end = getJitteredVec3(toLat, toLon, 0.8, startTime);

    const distance = start.distanceTo(end);
    const height = getArcHeight(distance);

    const mid = start
      .clone()
      .add(end)
      .multiplyScalar(0.5)
      .normalize()
      .multiplyScalar(1 + height);

    const bezier = new THREE.QuadraticBezierCurve3(start, mid, end);
    const pts = bezier.getPoints(128);
    const geom = new THREE.BufferGeometry().setFromPoints(pts);

    return { points: pts, geometry: geom, curve: bezier, distance };
    
  }, [fromLat, fromLon, toLat, toLon, startTime]);

  const speedMultiplier = { icbm: 15, slbm: 18, air: 30 }[weapon] ?? 20;
  const duration = Math.max(5, distance * speedMultiplier);

  const rawProgress = (currentTime - startTime) / duration;
  const progress = THREE.MathUtils.clamp(rawProgress <= 0 ? 0.001 : rawProgress, 0, 1);

  const [coneOpacity, setConeOpacity] = useState(1);

  useFrame(() => {
    if (!lineRef.current) return;
    const geom = lineRef.current.geometry;
    const drawCount = Math.max(1, Math.ceil(points.length * progress));
    geom.setDrawRange(0, drawCount);

    if (progress >= 1) {
      const newOpacity = Math.max(0, lineRef.current.material.opacity - 0.03);
      lineRef.current.material.opacity = newOpacity;
      if (Math.abs(coneOpacity - newOpacity) > 1e-5) setConeOpacity(newOpacity);
    }
  });

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color="#ff5533" transparent opacity={1} depthWrite={false} />
      {(() => {
        const drawCount = Math.max(1, Math.ceil(points.length * progress));
        const tParam = Math.min(1, (drawCount - 1) / (points.length - 1));
        const tipPoint = curve.getPoint(tParam);
        const tangent = curve.getTangent(tParam);
        const coneQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0), 
            tangent.normalize()
        );

        return (
          <mesh position={tipPoint} quaternion={coneQuat}>
            <coneGeometry args={[0.003, 0.01, 8]} />
            <meshBasicMaterial color="#ff5533" transparent opacity={coneOpacity} depthWrite={false} />
          </mesh>
        );
      })()}
    </line>
  );
}
