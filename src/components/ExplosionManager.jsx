import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3";
import { getJitteredVec3 } from "../utils/jitter.js";

const FADE_WINDOW = 12;

function SingleExplosion({ event, targetNation, fromNation, currentTimeRef, fadeWindow }) {
    const meshRef = useRef();

    const { impactTick, position, geometry, material } = useMemo(() => {
        const start = latLonToVec3(fromNation.lat, fromNation.lon, 1.001);
        const end = getJitteredVec3(Number(targetNation.lat), Number(targetNation.lon), 0.8, Number(event.t));

        const distance = start.distanceTo(end);
        const speedMultiplier = { icbm: 15, slbm: 18, air: 30 }[event.weapon] ?? 20;
        const duration = Math.max(5, distance * speedMultiplier);

        return {
            impactTick: event.t + duration,
            position: end,
            geometry: new THREE.SphereGeometry(1, 32, 32),
            material: new THREE.MeshBasicMaterial({
                color: "#ffcc55",
                transparent: true,
                depthWrite: false,
            })
        };
    }, [event, targetNation, fromNation]);

    useEffect(() => {
        return () => {
            geometry.dispose();
            material.dispose();
        };
    }, [geometry, material]);

    useFrame(() => {
        if (!meshRef.current) return;

        const displayTime = currentTimeRef.current;
        const isVisible = displayTime >= impactTick && displayTime <= impactTick + fadeWindow;

        meshRef.current.visible = isVisible;

        if (isVisible) {
            const progress = (displayTime - impactTick) / fadeWindow;
            const scale = 0.005 + 0.04 * progress;
            meshRef.current.scale.setScalar(scale);
            meshRef.current.material.opacity = Math.pow(1 - progress, 2);
        }
    });

    return (
        <mesh 
            ref={meshRef} 
            position={position} 
            geometry={geometry} 
            material={material} 
        />
    );
}

export default function ExplosionManager({ events = [], nations, currentTime, smooth = true, speed = 2.0 }) {
    const lastTickRef = useRef(performance.now());
    const displayTimeRef = useRef(currentTime);

    useFrame(() => {
        if (smooth) {
            const now = performance.now();
            const deltaTicks = ((now - lastTickRef.current) / 1000) * speed;
            displayTimeRef.current += (currentTime + deltaTicks - displayTimeRef.current) * 0.1;
        } else {
            displayTimeRef.current = currentTime;
        }
        lastTickRef.current = performance.now();
    });

    const activeExplosions = useMemo(() => {
        return (events ?? []).filter((e) => {
            if (e.type !== "launch") return false;
            
            const from = nations[e.from];
            const to = nations[e.to];
            if (!from || !to) return false;

            const d = latLonToVec3(from.lat, from.lon, 1).distanceTo(
                latLonToVec3(to.lat, to.lon, 1)
            );
            const speedMultiplier = { icbm: 15, slbm: 18, air: 30 }[e.weapon] ?? 20;
            const impact = e.t + Math.max(5, d * speedMultiplier);

            return displayTimeRef.current >= impact - 5 && displayTimeRef.current < impact + FADE_WINDOW + 5;
        });
    }, [events, nations]);

    return (
        <>
            {activeExplosions.map((e, i) => (
                <SingleExplosion
                    key={`${e.from}-${e.to}-${e.t}-${i}`}
                    event={e}
                    targetNation={nations[e.to]}
                    fromNation={nations[e.from]}
                    currentTimeRef={displayTimeRef}
                    fadeWindow={FADE_WINDOW}
                />
            ))}
        </>
    );
}