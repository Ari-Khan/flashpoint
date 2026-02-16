import { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
    computeTrajectory,
    buildCubicCurveAndGeometry,
} from "../utils/trajectoryUtils.js";

const UP_AXIS = new THREE.Vector3(0, 1, 0);
const FADE_BUFFER = 0.5;
const CONE_GEOM = new THREE.ConeGeometry(0.003, 0.01, 8);

const ArcItem = ({
    id,
    fromLat,
    fromLon,
    toLat,
    toLon,
    weapon,
    startTime,
    displayTime,
    simTime,
    impactTick,
}) => {
    const lineRef = useRef();
    const coneRef = useRef();
    const tempVec = useRef(new THREE.Vector3()).current;

    const data = useMemo(() => {
        const traj = computeTrajectory({
            fromLat,
            fromLon,
            toLat,
            toLon,
            startTime,
            weapon,
        });

        const seed =
            Number(startTime) +
            (typeof id === "string" ? Number(id.split("-").pop() || 0) : 0);

        const curveData = buildCubicCurveAndGeometry({
            start: traj.start,
            end: traj.end,
            startTime,
            seed,
        });

        return { ...traj, ...curveData };
    }, [fromLat, fromLon, toLat, toLon, startTime, weapon, id]);

    useEffect(() => {
        return () => {
            if (data.geometry) data.geometry.dispose();
        };
    }, [data.geometry]);

    useFrame(() => {
        if (!lineRef.current || !coneRef.current) return;

        const delta = displayTime - startTime;
        const t = Math.max(0, Math.min(1, delta / data.duration));

        let u = t;
        const arcs = data.arcLengths;
        if (arcs?.length > 1) {
            let low = 0,
                high = arcs.length - 1;
            while (low < high) {
                const mid = (low + high) >>> 1;
                if (arcs[mid] < t) low = mid + 1;
                else high = mid;
            }
            const i = Math.max(0, low - 1);
            const lowArc = arcs[i];
            const range = arcs[i + 1] - lowArc;
            u = (i + (t - lowArc) / (range || 1)) / (arcs.length - 1);
        }

        lineRef.current.geometry.setDrawRange(
            0,
            Math.ceil(u * (data.pointsCount - 1))
        );

        if (t < 1) {
            data.curve.getPoint(u, coneRef.current.position);
            data.curve.getTangent(u, tempVec);
            coneRef.current.quaternion.setFromUnitVectors(
                UP_AXIS,
                tempVec.normalize()
            );
            coneRef.current.visible = true;
        } else {
            coneRef.current.visible = false;
        }

        const opacity =
            simTime >= impactTick
                ? Math.max(0, 1 - (simTime - impactTick) * (1 / FADE_BUFFER))
                : 1;

        lineRef.current.material.opacity = opacity;
        coneRef.current.material.opacity = opacity;
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
            <mesh ref={coneRef} geometry={CONE_GEOM} visible={false}>
                <meshBasicMaterial
                    color="#ff5533"
                    transparent
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
        </group>
    );
};

export default function ArcManager({ events, nations, displayTime, simTime }) {
    const activeEvents = useMemo(() => {
        if (!events || !nations) return [];
        const result = [];
        for (let i = 0; i < events.length; i++) {
            const e = events[i];
            if (e.type !== "launch") continue;

            const from = nations[e.from];
            const to = nations[e.to];
            if (!from || !to) continue;

            const fLat = e.fromLat ?? from.lat;
            const fLon = e.fromLon ?? from.lon;
            const tLat = e.toLat ?? to.lat;
            const tLon = e.toLon ?? to.lon;

            const traj = computeTrajectory({
                fromLat: fLat,
                fromLon: fLon,
                toLat: tLat,
                toLon: tLon,
                startTime: e.t,
                weapon: e.weapon,
            });

            const impactTick = e.t + traj.duration;

            if (simTime >= e.t && simTime <= impactTick + FADE_BUFFER) {
                result.push({
                    ...e,
                    fLat,
                    fLon,
                    tLat,
                    tLon,
                    impactTick,
                });
            }
        }
        return result;
    }, [events, nations, simTime]);

    return (
        <group>
            {activeEvents.map((e) => (
                <ArcItem
                    key={e.id ?? `${e.from}-${e.to}-${e.t}`}
                    {...e}
                    startTime={e.t}
                    displayTime={displayTime}
                    simTime={simTime}
                />
            ))}
        </group>
    );
}
