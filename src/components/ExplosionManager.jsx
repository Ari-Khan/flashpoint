import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3";

const FADE_WINDOW = 12;

function SingleExplosion({ event, targetNation, fromNation, currentTimeRef, fadeWindow }) {
    const meshRef = useRef();
    
    const { impactTick, position } = useMemo(() => {
        const start = latLonToVec3(fromNation.lat, fromNation.lon, 1.001);
        const end = latLonToVec3(targetNation.lat, targetNation.lon, 1.001);
        const speedMultiplier = { icbm: 15, slbm: 18, air: 30 }[event.weapon] ?? 20;
        const duration = Math.max(5, start.distanceTo(end) * speedMultiplier);
        
        return {
            impactTick: event.t + duration,
            position: end
        };
    }, [event, targetNation, fromNation]);

    useFrame(() => {
        if (!meshRef.current) return;

        const displayTime = currentTimeRef.current;
        const isVisible = displayTime >= impactTick && displayTime <= impactTick + fadeWindow;

        meshRef.current.visible = isVisible;

        if (isVisible) {
            const progress = (displayTime - impactTick) / fadeWindow;
            const scale = 0.01 + 0.04 * progress;
            meshRef.current.scale.setScalar(scale);
            meshRef.current.material.opacity = 1 - progress;
        }
    });

    return (
        <mesh ref={meshRef} position={position}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color="#ffcc55" transparent depthWrite={false} />
        </mesh>
    );
}

export default function ExplosionManager({ events = [], nations, currentTime, smooth = true, speed = 2.0 }) {
    const launchEvents = useMemo(() => events.filter((e) => e.type === "launch"), [events]);
    
    const lastTickRef = useRef(performance.now());
    const displayTimeRef = useRef(currentTime);

    useFrame(() => {
        if (smooth) {
            const now = performance.now();
            const deltaTicks = (now - lastTickRef.current) / 1000 * speed;
            displayTimeRef.current += (currentTime + deltaTicks - displayTimeRef.current) * 0.1;
        } else {
            displayTimeRef.current = currentTime;
        }
        lastTickRef.current = performance.now();
    });

    return (
        <>
            {launchEvents.map((e, i) => (
                <SingleExplosion 
                    key={`${e.to}-${e.t}-${i}`}
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