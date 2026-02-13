import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { computeTrajectory } from "../utils/trajectoryUtils.js";

const FADE_WINDOW = 6;
const SHARED_GEOM = new THREE.SphereGeometry(1, 16, 16);
const dummy = new THREE.Object3D();

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
                color: "#ffcc55",
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            }),
        []
    );

    const processedEvents = useMemo(() => {
        return (events ?? [])
            .filter(
                (e) => e.type === "launch" && nations[e.from] && nations[e.to]
            )
            .map((e) => {
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

                const count = Math.max(1, Number(e.count) || 1);
                const seed = Number(e.t) * 13.37 + count * 7.77;
                const rand = Math.abs(Math.sin(seed * 12.9898));

                const baseSize = 0.1;
                const countImpact = Math.pow(count, 0.65) * 0.35;
                const sizeMult = (baseSize + countImpact) * (0.8 + rand * 0.4);

                return {
                    id: `${e.from}-${e.to}-${e.t}`,
                    impactTick: e.t + traj.duration,
                    position: traj.end,
                    sizeMult,
                };
            });
    }, [events, nations]);

    useFrame(() => {
        displayTimeRef.current += (displayTime - displayTimeRef.current) * 0.1;

        if (!meshRef.current) return;

        const time = displayTimeRef.current;
        let activeCount = 0;

        processedEvents.forEach((e) => {
            const physProgress = (simTime - e.impactTick) / FADE_WINDOW;
            if (physProgress >= 0 && physProgress <= 1) {
                const progress = (time - e.impactTick) / FADE_WINDOW;
                const scale =
                    (0.001 + 0.02 * Math.max(0, progress)) * e.sizeMult;
                const opacity = Math.pow(Math.max(0, 1 - progress), 2.2);

                dummy.position.copy(e.position);
                dummy.scale.setScalar(Math.max(0.00001, scale));
                dummy.updateMatrix();

                meshRef.current.setMatrixAt(activeCount, dummy.matrix);
                meshRef.current.setColorAt(
                    activeCount,
                    new THREE.Color("#ffcc55").multiplyScalar(opacity)
                );
                activeCount++;
            }
        });

        meshRef.current.count = activeCount;
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor)
            meshRef.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh
            ref={meshRef}
            args={[SHARED_GEOM, mat, processedEvents.length]}
            frustumCulled={false}
        />
    );
}
