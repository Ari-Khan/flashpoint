import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3";

function getArcHeight(distance) {
  // distance is chord length on unit sphere
  return Math.min(0.6, distance * 0.8);
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

  // speed by weapon type (ticks)
  const duration = {
    icbm: 30,
    slbm: 35,
    air: 60,
  }[weapon] ?? 40;

  const progress = THREE.MathUtils.clamp(
    (currentTime - startTime) / duration,
    0,
    1
  );

  const points = useMemo(() => {
    const start = latLonToVec3(fromLat, fromLon, 1.001);
    const end = latLonToVec3(toLat, toLon, 1.001);

    const distance = start.distanceTo(end);
    const height = getArcHeight(distance);

    const mid = start
      .clone()
      .add(end)
      .multiplyScalar(0.5)
      .normalize()
      .multiplyScalar(1 + height);

    const curve = new THREE.QuadraticBezierCurve3(
      start,
      mid,
      end
    );

    return curve.getPoints(64);
  }, [fromLat, fromLon, toLat, toLon]);

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return geom;
  }, [points]);

  // animate draw + fade
  useFrame(() => {
    if (!lineRef.current) return;

    const geom = lineRef.current.geometry;
    const drawCount = Math.max(2, Math.floor(points.length * progress));
    geom.setDrawRange(0, drawCount);

    if (progress >= 1) {
      lineRef.current.material.opacity = Math.max(
        0,
        lineRef.current.material.opacity - 0.03
      );
    }
  });

  return (
    <line ref={lineRef} geometry={geometry}>
        <lineBasicMaterial
        color="#ff5533"
        transparent
        opacity={1}
        depthTest={false}
        depthWrite={false}
        />
    </line>
  );
}
