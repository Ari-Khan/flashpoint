import { useMemo } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3";

const DURATION_BY_WEAPON = {
    icbm: 30,
    slbm: 35,
    air: 60,
};

const FADE_WINDOW = 12; // ticks after impact to finish fade/expansion

export default function ExplosionManager({ events = [], nations, currentTime }) {
    const launchEvents = useMemo(
        () => events.filter((e) => e.type === "launch"),
        [events]
    );

    return (
        <>
            {launchEvents.map((e, i) => {
                const to = nations[e.to];
                if (!to || typeof to.lat !== "number" || typeof to.lon !== "number") {
                    return null;
                }

                const duration = DURATION_BY_WEAPON[e.weapon] ?? 40;
                const impactTick = e.t + duration;

                if (currentTime < impactTick || currentTime > impactTick + FADE_WINDOW) {
                    return null;
                }

                const progress = THREE.MathUtils.clamp(
                    (currentTime - impactTick) / FADE_WINDOW,
                    0,
                    1
                );

                // Tiny blast: ~1% -> ~3% of globe radius
                const scale = 0.01 + 0.02 * progress;
                const opacity = 1 - progress; // fade

                const position = latLonToVec3(to.lat, to.lon, 1.001);

                return (
                    <mesh
                        key={`${e.to}-${e.t}-${i}`}
                        position={position}
                        scale={scale}
                    >
                        <sphereGeometry args={[1, 16, 12]} />
                        <meshBasicMaterial
                            color="#ffcc55"
                            transparent
                            opacity={opacity}
                            depthTest
                            depthWrite={false}
                        />
                    </mesh>
                );
            })}
        </>
    );
}
