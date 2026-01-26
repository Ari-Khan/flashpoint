import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
    computeTrajectory,
    buildCubicCurveAndGeometry,
} from "../utils/trajectoryUtils.js";

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
    onComplete,
}) {
    const lineRef = useRef();
    const coneRef = useRef();
    const isDoneRef = useRef(false);
    const tempVec = useRef(new THREE.Vector3()).current;

    const { geometry, curve, duration, impactTime, pointsCount, arcLengths } =
        useMemo(() => {
            const {
                start,
                end,
                duration: dur,
                impactTick,
            } = computeTrajectory({
                fromLat,
                fromLon,
                toLat,
                toLon,
                startTime,
                weapon,
            });
            const {
                curve: cubicCurve,
                geometry: geom,
                arcLengths: arcs,
                pointsCount: count,
            } = buildCubicCurveAndGeometry({ start, end, startTime });

            return {
                geometry: geom,
                curve: cubicCurve,
                duration: dur,
                impactTime: impactTick,
                pointsCount: count,
                arcLengths: arcs,
            };
        }, [fromLat, fromLon, toLat, toLon, startTime, weapon]);

    useEffect(() => {
        return () => {
            geometry.dispose();
            if (lineRef.current) {
                lineRef.current.material.dispose();
            }
            if (coneRef.current) {
                coneRef.current.geometry.dispose();
                coneRef.current.material.dispose();
            }
        };
    }, [geometry]);

    useFrame(() => {
        if (!lineRef.current || !coneRef.current || isDoneRef.current) return;

        const t = THREE.MathUtils.clamp(
            (currentTime - startTime) / duration,
            0,
            1
        );

        let progress = t;
        if (t < 0.2) {
            const local = t / 0.2;
            progress = 0.2 * (local * local);
        }

        let u = progress;
        if (arcLengths?.length > 1) {
            if (progress <= 0) u = 0;
            else if (progress >= 1) u = 1;
            else {
                let low = 0,
                    high = arcLengths.length - 1;
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
            coneRef.current.quaternion.setFromUnitVectors(
                UP_AXIS,
                tempVec.normalize()
            );
            if (!coneRef.current.visible) coneRef.current.visible = true;
        } else {
            coneRef.current.visible = false;
        }

        if (currentTime >= impactTime) {
            const opacity = Math.max(0, 1 - (currentTime - impactTime) * 5);
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
                <lineBasicMaterial
                    color="#ff5533"
                    transparent
                    opacity={1}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </line>
            <mesh ref={coneRef} visible={false}>
                <coneGeometry args={[0.003, 0.01, 8]} />
                <meshBasicMaterial
                    color="#ff5533"
                    transparent
                    opacity={1}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
        </group>
    );
}
