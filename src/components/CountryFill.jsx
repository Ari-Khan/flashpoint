import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import earcut from "earcut";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";
import { latLonToVec3 } from "../utils/latLonToVec3.js";
import { useCountriesGeo } from "../hooks/useCountriesGeo.js";
import { getColorByIso } from "../utils/countryUtils.js";

const GEOMETRY_CACHE = new Map();
const MOD_1 = new TessellateModifier(2.0, 4);
const MOD_2 = new TessellateModifier(0.8, 6);
const MOD_3 = new TessellateModifier(0.3, 6);

function buildGeometries(features, countryCode) {
    if (!features?.length || !countryCode) return [];
    if (GEOMETRY_CACHE.has(countryCode)) return GEOMETRY_CACHE.get(countryCode);

    const internalGeometries = [];

    features.forEach((feature) => {
        const geom = feature.geometry;
        if (!geom) return;

        function buildMesh(rings) {
            if (!rings?.length || rings[0].length < 3) return;

            const vertices2D = [];
            const holeIndices = [];
            const outerRing = rings[0];

            let centerLon = 0;
            for (let i = 0; i < outerRing.length; i++)
                centerLon += outerRing[i][0];
            centerLon /= outerRing.length;

            rings.forEach((ring, index) => {
                if (index > 0) holeIndices.push(vertices2D.length / 2);
                ring.forEach(([lon, lat]) => {
                    let shiftedLon = lon - centerLon;
                    if (shiftedLon > 180) shiftedLon -= 360;
                    if (shiftedLon < -180) shiftedLon += 360;
                    vertices2D.push(shiftedLon, lat);
                });
            });

            const rawIndices = earcut(vertices2D, holeIndices);
            if (!rawIndices.length) return;

            const cleanIndices = [];
            for (let i = 0; i < rawIndices.length; i += 3) {
                const a = rawIndices[i],
                    b = rawIndices[i + 1],
                    c = rawIndices[i + 2];
                if (
                    Math.abs(vertices2D[a * 2] - vertices2D[b * 2]) > 180 ||
                    Math.abs(vertices2D[b * 2] - vertices2D[c * 2]) > 180
                )
                    continue;
                cleanIndices.push(a, b, c);
            }

            let geometry = new THREE.BufferGeometry();
            const flatPositions = new Float32Array((vertices2D.length / 2) * 3);
            for (let i = 0, j = 0; i < vertices2D.length; i += 2, j += 3) {
                flatPositions[j] = vertices2D[i];
                flatPositions[j + 1] = vertices2D[i + 1];
                flatPositions[j + 2] = 0;
            }
            geometry.setAttribute(
                "position",
                new THREE.BufferAttribute(flatPositions, 3)
            );
            geometry.setIndex(cleanIndices);

            try {
                geometry = MOD_1.modify(geometry);
                geometry = MOD_2.modify(geometry);
                geometry = MOD_3.modify(geometry);
            } catch {
                // Ignore modification errors; fallback to original geometry
            }

            const posAttr = geometry.getAttribute("position");
            for (let i = 0; i < posAttr.count; i++) {
                let lon = posAttr.getX(i) + centerLon;
                if (lon > 180) lon -= 360;
                if (lon < -180) lon += 360;
                const v = latLonToVec3(posAttr.getY(i), lon, 1.003);
                posAttr.setXYZ(i, v.x, v.y, v.z);
            }

            geometry.computeVertexNormals();
            internalGeometries.push(geometry);
        }

        if (geom.type === "Polygon") buildMesh(geom.coordinates);
        else if (geom.type === "MultiPolygon")
            geom.coordinates.forEach(buildMesh);
    });

    GEOMETRY_CACHE.set(countryCode, internalGeometries);
    return internalGeometries;
}

export default function CountryFill({
    activeIsos = [],
    nations = {},
    opacity = 0.4,
}) {
    const geo = useCountriesGeo();
    const materialRefs = useRef({});
    const prevIsosRef = useRef(new Set());
    const animsRef = useRef(new Map());

    const activeGroups = useMemo(() => {
        if (!geo?.features) return [];
        const uniqueIsos = [...new Set(activeIsos.map((i) => i.toUpperCase()))];
        return uniqueIsos
            .map((iso) => {
                const features = geo.features.filter((f) => {
                    const p = f.properties || {};
                    return [
                        p.adm0_a3,
                        p.iso_a3_eh,
                        p.gu_a3,
                        p.ISO_A3,
                        p.iso_a3,
                    ].includes(iso);
                });
                return { iso, features, color: getColorByIso(iso, nations) };
            })
            .filter((g) => g.features.length > 0);
    }, [geo, activeIsos, nations]);

    const meshesByIso = useMemo(() => {
        const map = new Map();
        activeGroups.forEach((g) =>
            map.set(g.iso, buildGeometries(g.features, g.iso))
        );
        return map;
    }, [activeGroups]);

    useEffect(() => {
        const now = performance.now();
        const currentIsos = new Set(activeGroups.map((g) => g.iso));

        activeGroups.forEach(({ iso }) => {
            if (!prevIsosRef.current.has(iso)) {
                const count = (meshesByIso.get(iso) || []).length;
                for (let i = 0; i < count; i++) {
                    animsRef.current.set(`${iso}-${i}`, {
                        type: "in",
                        start: now,
                        duration: 600,
                    });
                }
            }
        });

        prevIsosRef.current.forEach((iso) => {
            if (!currentIsos.has(iso)) {
                Object.keys(materialRefs.current).forEach((key) => {
                    if (key.startsWith(`${iso}-`)) {
                        animsRef.current.set(key, {
                            type: "out",
                            start: now,
                            duration: 300,
                        });
                    }
                });
            }
        });
        prevIsosRef.current = currentIsos;
    }, [activeGroups, meshesByIso]);

    useEffect(() => {
        let rafId;
        const tick = (time) => {
            animsRef.current.forEach((anim, key) => {
                const mat = materialRefs.current[key];
                if (!mat) return;
                const t = Math.max(
                    0,
                    Math.min(1, (time - anim.start) / anim.duration)
                );
                const eased = t * t * (3 - 2 * t);
                mat.opacity =
                    anim.type === "in"
                        ? opacity * eased
                        : opacity * (1 - eased);
                if (t >= 1) {
                    if (anim.type === "out") mat.opacity = 0;
                    animsRef.current.delete(key);
                }
            });
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [opacity]);

    if (!geo) return null;

    return (
        <group>
            {activeGroups.map(({ iso, color }) => (
                <group key={iso}>
                    {(meshesByIso.get(iso) || []).map((geometry, i) => (
                        <mesh
                            key={`${iso}-${i}`}
                            geometry={geometry}
                            renderOrder={10}
                        >
                            <meshBasicMaterial
                                ref={(el) =>
                                    (materialRefs.current[`${iso}-${i}`] = el)
                                }
                                color={color}
                                transparent
                                opacity={0}
                                side={THREE.DoubleSide}
                                depthWrite={false}
                                toneMapped={false}
                            />
                        </mesh>
                    ))}
                </group>
            ))}
        </group>
    );
}
