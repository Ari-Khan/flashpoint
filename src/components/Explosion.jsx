import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { computeTrajectory } from "../utils/trajectoryUtils.js";

const FADE_WINDOW = 6;
const SHARED_GEOM = new THREE.SphereGeometry(1, 12, 12);
const DUMMY = new THREE.Object3D();
const BASE_COLOR = new THREE.Color("#ffcc55");
const TEMP_COLOR = new THREE.Color();
const MAX_EXPLOSIONS = 1000;

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
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            }),
        []
    );

    const processedEvents = useMemo(() => {
        if (!events || !nations) return [];
        return events
            .filter(
                (e) => e.type === "launch" && nations[e.from] && nations[e.to]
            )
            .map((e) => {
                const traj = computeTrajectory({
                    fromLat: e.fromLat ?? nations[e.from].lat,
                    fromLon: e.fromLon ?? nations[e.from].lon,
                    toLat: e.toLat ?? nations[e.to].lat,
                    toLon: e.toLon ?? nations[e.to].lon,
                    startTime: e.t,
                    weapon: e.weapon,
                });
                const count = Math.max(1, Number(e.count) || 1);
                const seed = e.t * 13.37 + count * 7.77;
                const rand = Math.abs(Math.sin(seed * 12.9898));

                return {
                    impactTick: e.t + traj.duration,
                    position: traj.end,
                    sizeMult:
                        (0.1 + Math.pow(count, 0.65) * 0.35) *
                        (0.8 + rand * 0.4),
                };
            });
    }, [events, nations]);

    useFrame(() => {
        const mesh = meshRef.current;
        if (!mesh) return;

        displayTimeRef.current += (displayTime - displayTimeRef.current) * 0.1;
        const time = displayTimeRef.current;
        let renderedCount = 0;

        for (let i = 0; i < processedEvents.length; i++) {
            if (renderedCount >= MAX_EXPLOSIONS) break;

            const e = processedEvents[i];
            const progress = (time - e.impactTick) / FADE_WINDOW;

            if (progress >= 0 && progress <= 1) {
                const scale = (0.001 + 0.03 * progress) * e.sizeMult;
                const opacity = Math.pow(1 - progress, 2.0);

                DUMMY.position.copy(e.position);
                DUMMY.scale.setScalar(scale);
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
            args={[SHARED_GEOM, mat, MAX_EXPLOSIONS]}
            frustumCulled={false}
        />
    );
}
