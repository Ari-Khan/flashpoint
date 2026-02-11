import { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
    computeTrajectory,
    buildCubicCurveAndGeometry,
} from "../utils/trajectoryUtils.js";

const UP_AXIS = new THREE.Vector3(0, 1, 0);
const FADE_BUFFER = 0.25;

function ArcItem({
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

    const data = useMemo(() => {
        const traj = computeTrajectory({
            fromLat, fromLon, toLat, toLon, startTime, weapon,
        });
        
        const seed = Number(startTime) + (typeof id === "string" ? Number(id.split("-").pop() || 0) : 0);
        
        const curveData = buildCubicCurveAndGeometry({ 
            start: traj.start, 
            end: traj.end, 
            startTime, 
            seed 
        });

        return { ...traj, ...curveData };
    }, [fromLat, fromLon, toLat, toLon, startTime, weapon, id]);

    useEffect(() => () => {
        data.geometry.dispose();
        if (lineRef.current) lineRef.current.material.dispose();
        if (coneRef.current) {
            coneRef.current.geometry.dispose();
            coneRef.current.material.dispose();
        }
    }, [data.geometry]);

    useFrame(() => {
        if (isDoneRef.current || !lineRef.current || !coneRef.current) return;

        const t = THREE.MathUtils.clamp((currentTime - startTime) / data.duration, 0, 1);
        
        let progress = t < 0.2 ? 0.2 * ((t / 0.2) ** 2) : t;

        let u = progress;
        const arcs = data.arcLengths;
        if (arcs?.length > 1) {
            let low = 0, high = arcs.length - 1;
            while (low < high) {
                const mid = (low + high) >>> 1;
                if (arcs[mid] < progress) low = mid + 1;
                else high = mid;
            }
            const i = Math.max(0, low - 1);
            const lowArc = arcs[i];
            const range = arcs[i + 1] - lowArc;
            u = (i + (progress - lowArc) / (range || 1)) / (arcs.length - 1);
        }

        lineRef.current.geometry.setDrawRange(0, Math.ceil(u * (data.pointsCount - 1)));

        if (progress < 1) {
            data.curve.getPoint(u, coneRef.current.position);
            data.curve.getTangent(u, tempVec);
            coneRef.current.quaternion.setFromUnitVectors(UP_AXIS, tempVec.normalize());
            coneRef.current.visible = true;
        } else {
            coneRef.current.visible = false;
        }

        if (currentTime >= data.impactTick) {
            const opacity = Math.max(0, 1 - (currentTime - data.impactTick) * 4);
            lineRef.current.material.opacity = opacity;
            coneRef.current.material.opacity = opacity;

            if (opacity <= 0) {
                isDoneRef.current = true;
                onComplete?.(id);
            }
        }
    });

    return (
        <group>
            <line ref={lineRef} geometry={data.geometry}>
                <lineBasicMaterial 
                    color="#ff4d00" 
                    transparent 
                    depthWrite={false} 
                    blending={THREE.AdditiveBlending} 
                />
            </line>
            <mesh ref={coneRef} visible={false}>
                <coneGeometry args={[0.003, 0.01, 8]} />
                <meshBasicMaterial 
                    color="#ff5533" 
                    transparent 
                    depthWrite={false} 
                    blending={THREE.AdditiveBlending} 
                />
            </mesh>
        </group>
    );
}

export default function ArcManager({ events, nations, currentTime }) {
    const activeEvents = useMemo(() => {
        if (!events || !nations) return [];
        
        return events.filter(e => {
            if (e.type !== "launch") return false;
            
            const from = nations[e.from];
            const to = nations[e.to];
            if (!from || !to) return false;

            const { impactTick } = computeTrajectory({
                fromLat: e.fromLat ?? from.lat,
                fromLon: e.fromLon ?? from.lon,
                toLat: e.toLat ?? to.lat,
                toLon: e.toLon ?? to.lon,
                startTime: e.t,
                weapon: e.weapon,
            });

            return currentTime >= e.t && currentTime <= impactTick + FADE_BUFFER;
        });
    }, [events, nations, currentTime]);

    return (
        <group>
            {activeEvents.map((e) => {
                const from = nations[e.from];
                const to = nations[e.to];
                return (
                    <ArcItem
                        key={e.id ?? `${e.from}-${e.to}-${e.t}`}
                        id={e.id ?? `${e.from}-${e.to}-${e.t}`}
                        fromLat={e.fromLat ?? from.lat}
                        fromLon={e.fromLon ?? from.lon}
                        toLat={e.toLat ?? to.lat}
                        toLon={e.toLon ?? to.lon}
                        weapon={e.weapon}
                        startTime={e.t}
                        currentTime={currentTime}
                    />
                );
            })}
        </group>
    );
}