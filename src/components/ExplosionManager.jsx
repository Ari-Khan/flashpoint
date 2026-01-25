import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { computeTrajectory } from "../utils/trajectory.js";

const FADE_WINDOW = 6;

const SHARED_GEOM = new THREE.SphereGeometry(1, 16, 16);

function SingleExplosion({ event, targetNation, fromNation, currentTimeRef, fadeWindow }) {
    const meshRef = useRef();
    
    const mat = useMemo(() => new THREE.MeshBasicMaterial({
        color: "#ffcc55",
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    }), []);

    const { impactTick, position, sizeMultiplier } = useMemo(() => {
        const { start, end, distance, duration } = computeTrajectory({
            fromLat: event.fromLat ?? fromNation.lat,
            fromLon: event.fromLon ?? fromNation.lon,
            toLat: event.toLat ?? targetNation.lat,
            toLon: event.toLon ?? targetNation.lon,
            startTime: event.t,
            weapon: event.weapon
        });

        const count = Math.max(1, Number(event.count) || 1);
        const seed = Number(event.t) * 13.37 + (count * 7.77);
        const rand = Math.abs(Math.sin(seed * 12.9898));

        const t = Math.min(1, count / 25);
        const sizeMultiplier = (0.05 + Math.sqrt(t) * 1.95) * (0.8 + rand * 0.4);

        return {
            impactTick: event.t + duration,
            position: end,
            sizeMultiplier
        };
    }, [event, targetNation, fromNation]);

    useEffect(() => () => mat.dispose(), [mat]);

    useFrame(() => {
        if (!meshRef.current) return;
        const displayTime = currentTimeRef.current;
        const isVisible = displayTime >= impactTick && displayTime <= impactTick + fadeWindow;

        meshRef.current.visible = isVisible;

        if (isVisible) {
            const progress = (displayTime - impactTick) / fadeWindow;
            const scale = Math.max(0.0005, (0.003 + 0.03 * progress) * (sizeMultiplier ?? 1));
            meshRef.current.scale.setScalar(scale);
            meshRef.current.material.opacity = Math.pow(1 - progress, 1.8);
        }
    });

    return (
        <mesh 
            ref={meshRef} 
            position={position} 
            geometry={SHARED_GEOM} 
            material={mat}
            renderOrder={10}
        />
    );
}

export default function ExplosionManager({ events = [], nations, currentTime, smooth = true, speed = 2.0 }) {
    const lastTickRef = useRef(0);
    const displayTimeRef = useRef(currentTime);

    useFrame(() => {
        const now = performance.now();
        if (smooth) {
            if (lastTickRef.current === 0) lastTickRef.current = now;
            const deltaTicks = ((now - lastTickRef.current) / 1000) * speed;
            displayTimeRef.current += (currentTime + deltaTicks - displayTimeRef.current) * 0.1;
        } else {
            displayTimeRef.current = currentTime;
        }
        lastTickRef.current = now;
    });

    const activeExplosions = useMemo(() => {
        return (events ?? []).filter((e) => {
            if (e.type !== "launch") return false;
            const from = nations[e.from];
            const to = nations[e.to];
            if (!from || !to) return false;

            const { distance, duration, impactTick } = computeTrajectory({
                fromLat: e.fromLat ?? from.lat,
                fromLon: e.fromLon ?? from.lon,
                toLat: e.toLat ?? to.lat,
                toLon: e.toLon ?? to.lon,
                startTime: e.t,
                weapon: e.weapon
            });
            return currentTime >= impactTick - 5 && currentTime < impactTick + FADE_WINDOW + 5;
        });
    }, [events, nations, currentTime]);

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