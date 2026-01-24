import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { latLonToVec3 } from "../utils/latLonToVec3";
import { getJitteredVec3 } from "../utils/jitter";

const FADE_WINDOW = 12;

function SingleExplosion({ event, targetNation, fromNation, currentTimeRef, fadeWindow }) {
    const meshRef = useRef();
    
    const { impactTick, position } = useMemo(() => {
        const start = latLonToVec3(fromNation.lat, fromNation.lon, 1.001);
        
        const jitteredEnd = getJitteredVec3(targetNation.lat, targetNation.lon, 0.8, event.t);

        const speedMultiplier = { icbm: 15, slbm: 18, air: 30 }[event.weapon] ?? 20;
        const distance = start.distanceTo(jitteredEnd);
        const duration = Math.max(5, distance * speedMultiplier);
        
        return {
            impactTick: event.t + duration,
            position: jitteredEnd
        };
    }, [event, targetNation, fromNation]);

    useFrame(() => {
        if (!meshRef.current) return;

        const displayTime = currentTimeRef.current;
        const isVisible = displayTime >= impactTick && displayTime <= impactTick + fadeWindow;

        meshRef.current.visible = isVisible;

        if (isVisible) {
            const progress = (displayTime - impactTick) / fadeWindow;
            // Explosion starts tiny and grows
            const scale = 0.005 + 0.04 * progress;
            meshRef.current.scale.setScalar(scale);
            meshRef.current.material.opacity = Math.pow(1 - progress, 2);
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