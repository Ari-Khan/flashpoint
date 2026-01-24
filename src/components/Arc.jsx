import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3.js";
import { getJitteredVec3 } from "../utils/jitter.js";

function getArcHeight(distance) {
    return Math.min(1.5, Math.pow(distance, 0.7) * 0.5);
}

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
    const dotRef = useRef();
    const isDoneRef = useRef(false);
    const [coneOpacity, setConeOpacity] = useState(1);

    const { points, geometry, curve, distance, duration, impactTime, origin, dotGeometry } = useMemo(() => {
        const start = latLonToVec3(fromLat, fromLon, 1.001);
        const end = getJitteredVec3(Number(toLat), Number(toLon), 0.8, Number(startTime));
        const d = start.distanceTo(end);
        const h = getArcHeight(d);

        const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(1 + h);
        const bezier = new THREE.QuadraticBezierCurve3(start, mid, end);
        const pts = bezier.getPoints(128);
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        
        // Sphere for the origin dot
        const dotGeom = new THREE.SphereGeometry(0.002, 8, 8);

        const speedMultiplier = { icbm: 15, slbm: 18, air: 30 }[weapon] ?? 20;
        const dur = Math.max(5, d * speedMultiplier);

        return { 
            points: pts, 
            geometry: geom, 
            curve: bezier, 
            distance: d, 
            duration: dur,
            impactTime: startTime + dur,
            origin: start,
            dotGeometry: dotGeom
        };
    }, [fromLat, fromLon, toLat, toLon, startTime, weapon]);

    useEffect(() => {
        return () => {
            geometry.dispose();
            dotGeometry.dispose();
        };
    }, [geometry, dotGeometry]);

    const progress = THREE.MathUtils.clamp((currentTime - startTime) / duration, 0, 1);

    useFrame(() => {
        if (!lineRef.current || isDoneRef.current) return;

        const mat = lineRef.current.material;
        const geom = lineRef.current.geometry;
        const dotMat = dotRef.current.material;

        const drawCount = Math.max(1, Math.ceil(points.length * progress));
        geom.setDrawRange(0, drawCount);

        const pauseDuration = 0.5;
        if (currentTime >= impactTime + pauseDuration) {
            const newOpacity = Math.max(0, mat.opacity - 0.05);
            mat.opacity = newOpacity;
            dotMat.opacity = newOpacity;
            
            if (Math.abs(coneOpacity - newOpacity) > 0.01) setConeOpacity(newOpacity);

            if (newOpacity <= 0 && !isDoneRef.current) {
                isDoneRef.current = true;
                onComplete(id);
            }
        }
    });

    const currentDrawCount = Math.max(1, Math.ceil(points.length * progress));
    const tParam = Math.min(1, (currentDrawCount - 1) / (points.length - 1));
    const tipPoint = curve.getPoint(tParam);
    const tangent = curve.getTangent(tParam);
    const coneQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        tangent.normalize()
    );

    return (
        <group>
            <mesh ref={dotRef} position={origin} geometry={dotGeometry}>
                <meshBasicMaterial color="#ff5533" transparent opacity={1} depthWrite={false} />
            </mesh>

            <line ref={lineRef} geometry={geometry}>
                <lineBasicMaterial color="#ff5533" transparent opacity={1} depthWrite={false} />
                <mesh position={tipPoint} quaternion={coneQuat}>
                    <coneGeometry args={[0.003, 0.01, 8]} />
                    <meshBasicMaterial color="#ff5533" transparent opacity={coneOpacity} depthWrite={false} />
                </mesh>
            </line>
        </group>
    );
}