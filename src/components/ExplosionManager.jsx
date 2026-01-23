import { useMemo } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3";

const FADE_WINDOW = 12;

export default function ExplosionManager({ events = [], nations, currentTime }) {
    const launchEvents = useMemo(
        () => events.filter((e) => e.type === "launch"),
        [events]
    );

    return (
        <>
            {launchEvents.map((e, i) => {
                const from = nations[e.from];
                const to = nations[e.to];
                if (!from || !to || typeof from.lat !== "number" || typeof from.lon !== "number") {
                    return null;
                }
                if (!to || typeof to.lat !== "number" || typeof to.lon !== "number") {
                    return null;
                }

                const start = latLonToVec3(from.lat, from.lon, 1.001);
                const end = latLonToVec3(to.lat, to.lon, 1.001);
                const distance = start.distanceTo(end);

                const speedMultiplier = {
                    icbm: 15,
                    slbm: 18,
                    air: 30,
                }[e.weapon] ?? 20;

                const duration = Math.max(5, distance * speedMultiplier);
                const impactTick = e.t + duration;

                if (currentTime < impactTick || currentTime > impactTick + FADE_WINDOW) {
                    return null;
                }

                const progress = THREE.MathUtils.clamp(
                    (currentTime - impactTick) / FADE_WINDOW,
                    0,
                    1
                );

                const scale = 0.01 + 0.02 * progress;
                const opacity = 1 - progress;

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
