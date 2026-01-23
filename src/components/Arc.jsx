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

  const { points, geometry, curve } = useMemo(() => {
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

    const bezier = new THREE.QuadraticBezierCurve3(start, mid, end);
    const pts = bezier.getPoints(64);
    const geom = new THREE.BufferGeometry().setFromPoints(pts);

    return { points: pts, geometry: geom, curve: bezier };
  }, [fromLat, fromLon, toLat, toLon]);

  // animate draw + fade
  useFrame(() => {
    if (!lineRef.current) return;

    const geom = lineRef.current.geometry;
    const drawCount = Math.max(5, Math.ceil(points.length * progress));
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
        depthTest
        depthWrite={false}
      />
      {/* Tiny cone warhead riding the tip */}
      {(() => {
        const drawCount = Math.max(2, Math.ceil(points.length * progress));
        const tParam = Math.min(1, (drawCount - 1) / (points.length - 1));

        const tipPoint = curve.getPoint(tParam);
        const tangent = curve.getTangent(tParam);
        const coneQuat = new THREE.Quaternion();
        const coneHeight = 0.01;
        const coneRadius = 0.003;
        let direction = tangent.clone();
        if (direction.lengthSq() > 1e-6) {
          direction.normalize();
          coneQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        } else {
          // fallback to previous point to avoid zero-length tangent
          const prevPoint = curve.getPoint(Math.max(0, progress - 0.01));
          direction = tipPoint.clone().sub(prevPoint).normalize();
          coneQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        }
        const coneOpacity = lineRef.current?.material?.opacity ?? 1;

        // Place base back so the apex lands exactly on the arc tip
        const conePos = tipPoint.clone().sub(direction.clone().multiplyScalar(coneHeight * 0.5));

        return (
          <mesh position={conePos} quaternion={coneQuat}>
            <coneGeometry args={[coneRadius, coneHeight, 8]} />
            <meshBasicMaterial
              color="#ff5533"
              transparent
              opacity={coneOpacity}
              depthTest
              depthWrite={false}
            />
          </mesh>
        );
      })()}
    </line>
  );
}
