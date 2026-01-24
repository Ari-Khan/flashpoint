import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3.js";
import { getJitteredVec3 } from "../utils/jitter.js";

function getArcHeight(distance, seed) {
    const variance = (Math.sin(seed * 12.9898) * 0.03);
    
    const loft = -0.5 + (distance * 0.7);
    
    return Math.max(0.1, loft) + variance;
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
        const end = getJitteredVec3(Number(toLat), Number(toLon), 1.001, Number(startTime));
        
        const d = start.distanceTo(end);
        const h = getArcHeight(d, Number(startTime));

        let midPoint = new THREE.Vector3().addVectors(start, end).normalize();
        if (start.dot(end) < -0.9) {
            const tempAxis = Math.abs(start.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
            midPoint = new THREE.Vector3().crossVectors(start, tempAxis).normalize();
        }

        const startDir = start.clone().normalize();
        const endDir = end.clone().normalize();

        const ctrl1 = new THREE.Vector3().lerpVectors(startDir, midPoint, 0.5).normalize().multiplyScalar(1.001 + h);
        const ctrl2 = new THREE.Vector3().lerpVectors(endDir, midPoint, 0.5).normalize().multiplyScalar(1.001 + h);

        const cubicCurve = new THREE.CubicBezierCurve3(start, ctrl1, ctrl2, end);
        
        const resolution = d > 1 ? 160 : 80;
        const pts = cubicCurve.getPoints(resolution);
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        
        const dotGeom = new THREE.SphereGeometry(0.002, 8, 8);
        const speedMultiplier = { icbm: 15, slbm: 18, air: 30 }[weapon] ?? 20;
        const dur = Math.max(5, d * speedMultiplier);

        return { 
            points: pts, 
            geometry: geom, 
            curve: cubicCurve, 
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

    const rawProgress = THREE.MathUtils.clamp((currentTime - startTime) / duration, 0, 1);
    
    const progress = rawProgress < 0.5 
        ? 2 * rawProgress * rawProgress 
        : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

    useFrame(() => {
        if (!lineRef.current || isDoneRef.current) return;

        const mat = lineRef.current.material;
        const geom = lineRef.current.geometry;
        const dotMat = dotRef.current.material;

        const drawCount = Math.max(1, Math.ceil(points.length * progress));
        geom.setDrawRange(0, drawCount);

        const pauseDuration = 0.25;
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