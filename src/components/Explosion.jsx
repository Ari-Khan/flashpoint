import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { computeTrajectory } from "../utils/trajectoryUtils.js";

const FADE_WINDOW = 6;
const SHARED_GEOM = new THREE.SphereGeometry(1, 16, 16);
const DUMMY = new THREE.Object3D();
const BASE_COLOR = new THREE.Color("#ffcc55");
const TEMP_COLOR = new THREE.Color();

export default function ExplosionManager({
    events = [],
    nations,
    displayTime,
    simTime,
}) {
    const meshRef = useRef();
    const displayTimeRef = useRef(displayTime);

    const mat = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                color: "#ffffff",
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            }),
        []
    );

    const activeExplosions = useMemo(() => {
        if (!events || !nations) return [];

        const valid = [];
        const len = events.length;

        for (let i = 0; i < len; i++) {
            const e = events[i];
            if (e.type !== "launch" || !nations[e.from] || !nations[e.to])
                continue;

            const from = nations[e.from];
            const to = nations[e.to];

            const traj = computeTrajectory({
                fromLat: e.fromLat ?? from.lat,
                fromLon: e.fromLon ?? from.lon,
                toLat: e.toLat ?? to.lat,
                toLon: e.toLon ?? to.lon,
                startTime: e.t,
                weapon: e.weapon,
            });

            const impactTick = e.t + traj.duration;

            if (simTime < e.t || simTime > impactTick + FADE_WINDOW) continue;

            const count = Math.max(1, Number(e.count) || 1);
            const seed = e.t * 13.37 + count * 7.77;
            const rand = Math.abs(Math.sin(seed * 12.9898));

            valid.push({
                impactTick,
                position: traj.end,
                sizeMult:
                    (0.1 + Math.pow(count, 0.65) * 0.35) * (0.8 + rand * 0.4),
            });
        }
        return valid;
    }, [events, nations, simTime]);

    useFrame(() => {
        const mesh = meshRef.current;
        if (!mesh) return;

        if (activeExplosions.length === 0) {
            mesh.count = 0;
            return;
        }

        displayTimeRef.current += (displayTime - displayTimeRef.current) * 0.1;
        const time = displayTimeRef.current;
        const len = activeExplosions.length;
        let renderedCount = 0;

        for (let i = 0; i < len; i++) {
            const e = activeExplosions[i];
            const progress = (time - e.impactTick) / FADE_WINDOW;

            if (progress >= 0 && progress <= 1) {
                const scale = (0.001 + 0.02 * progress) * e.sizeMult;
                const opacity = Math.pow(1 - progress, 2.2);

                DUMMY.position.copy(e.position);
                DUMMY.scale.setScalar(Math.max(0.00001, scale));
                DUMMY.updateMatrix();

                mesh.setMatrixAt(renderedCount, DUMMY.matrix);

                TEMP_COLOR.copy(BASE_COLOR).multiplyScalar(opacity);
                mesh.setColorAt(renderedCount, TEMP_COLOR);

                renderedCount++;
            }
        }

        mesh.count = renderedCount;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh
            ref={meshRef}
            args={[SHARED_GEOM, mat, activeExplosions.length || 1]}
            frustumCulled={false}
        />
    );
}
