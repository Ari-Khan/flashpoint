import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import earcut from "earcut";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";
import { latLonToVec3 } from "../utils/latLonToVec3.js";
import { useCountriesGeo } from "../hooks/useCountriesGeo.js";
import { getColorByIso } from "../utils/countryUtils.js";

const GEOMETRY_CACHE = new Map();

function buildGeometries(features, countryCode) {
    if (!features?.length || !countryCode) return [];
    if (GEOMETRY_CACHE.has(countryCode)) return GEOMETRY_CACHE.get(countryCode);

    const internalGeometries = [];

    features.forEach((feature) => {
        const geom = feature.geometry;
        if (!geom) return;

        function buildMesh(rings) {
            if (!rings?.length) return;

            const vertices2D = [];
            const holeIndices = [];
            const outerRing = rings[0];

            if (outerRing.length < 3) return;

            let centerLon = 0;
            outerRing.forEach(([lon]) => {
                centerLon += lon;
            });
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

            const isHuge =
                feature.properties?.iso_a3 === "RUS" ||
                feature.properties?.ISO_A3 === "RUS";
            const maxDist = isHuge ? 170 : 120;
            const cleanIndices = [];
            for (let i = 0; i < rawIndices.length; i += 3) {
                const a = rawIndices[i],
                    b = rawIndices[i + 1],
                    c = rawIndices[i + 2];
                if (
                    Math.abs(vertices2D[a * 2] - vertices2D[b * 2]) > maxDist ||
                    Math.abs(vertices2D[b * 2] - vertices2D[c * 2]) > maxDist ||
                    Math.abs(vertices2D[c * 2] - vertices2D[a * 2]) > maxDist
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
                geometry = new TessellateModifier(1.0, 5).modify(geometry);
                geometry = new TessellateModifier(0.15, 8).modify(geometry);
            } catch {
                geometry = new TessellateModifier(0.5, 4).modify(geometry);
            }

            const posAttr = geometry.getAttribute("position");
            for (let i = 0; i < posAttr.count; i++) {
                let lon = posAttr.getX(i) + centerLon;
                const lat = posAttr.getY(i);
                if (lon > 180) lon -= 360;
                if (lon < -180) lon += 360;
                const v = latLonToVec3(lat, lon, 1.002);
                posAttr.setXYZ(i, v.x, v.y, v.z);
            }

            geometry.computeVertexNormals();
            internalGeometries.push(geometry);
        }

        if (geom.type === "Polygon") {
            buildMesh(geom.coordinates);
        } else if (geom.type === "MultiPolygon") {
            geom.coordinates.forEach((polygonRings) => buildMesh(polygonRings));
        }
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

    const geoMap = useMemo(() => {
        if (!geo?.features) return null;
        const map = new Map();

        geo.features.forEach((f) => {
            const p = f.properties || {};
            const keys = [p.adm0_a3, p.iso_a3_eh, p.gu_a3];

            const seen = new Set();
            keys.forEach((key) => {
                if (key && typeof key === "string" && key !== "-99") {
                    const normalized = key.toUpperCase();
                    if (!seen.has(normalized)) {
                        if (!map.has(normalized)) map.set(normalized, []);
                        map.get(normalized).push(f);
                        seen.add(normalized);
                    }
                }
            });
        });
        return map;
    }, [geo]);

    const activeGroups = useMemo(() => {
        if (!geoMap || !activeIsos.length) return [];

        const uniqueIsos = Array.from(
            new Set(activeIsos.map((i) => i.toUpperCase()))
        );
        const groups = [];

        for (const iso of uniqueIsos) {
            const matchingFeatures = geoMap.get(iso);
            if (matchingFeatures) {
                groups.push({
                    iso,
                    matchingFeatures,
                    color: getColorByIso(iso, nations),
                });
            }
        }
        return groups;
    }, [geoMap, activeIsos, nations]);

    const meshesByIso = useMemo(() => {
        const map = new Map();
        activeGroups.forEach(({ iso, matchingFeatures }) => {
            map.set(iso, buildGeometries(matchingFeatures, iso));
        });
        return map;
    }, [activeGroups]);

    const prevIsosRef = useRef(new Set());
    const animsRef = useRef(new Map());
    const firstLaunchDoneRef = useRef(false);

    useEffect(() => {
        const prev = prevIsosRef.current;
        const currentIsos = new Set(activeGroups.map((g) => g.iso));
        const now = performance.now();

        const entering = [];
        for (const iso of currentIsos) {
            if (!prev.has(iso)) entering.push(iso);
        }

        let firstBufferedIso = null;
        if (
            !firstLaunchDoneRef.current &&
            prev.size === 0 &&
            entering.length > 0
        ) {
            firstBufferedIso = entering[0];
            firstLaunchDoneRef.current = true;
        }

        for (const iso of currentIsos) {
            if (!prev.has(iso)) {
                const geometries = meshesByIso.get(iso) || [];
                const startTime = firstBufferedIso === iso ? now + 250 : now;
                for (let i = 0; i < geometries.length; i++) {
                    animsRef.current.set(`${iso}-${i}`, {
                        type: "in",
                        start: startTime,
                        duration: 600,
                    });
                }
            }
        }

        for (const iso of prev) {
            if (!currentIsos.has(iso)) {
                const geometries = meshesByIso.get(iso) || [];
                if (geometries.length) {
                    for (let i = 0; i < geometries.length; i++) {
                        animsRef.current.set(`${iso}-${i}`, {
                            type: "out",
                            start: now,
                            duration: 300,
                        });
                    }
                } else {
                    Object.keys(materialRefs.current).forEach((k) => {
                        if (k.startsWith(`${iso}-`)) {
                            animsRef.current.set(k, {
                                type: "out",
                                start: now,
                                duration: 300,
                            });
                        }
                    });
                }
            }
        }

        prevIsosRef.current = currentIsos;
    }, [activeGroups, meshesByIso]);

    useEffect(() => {
        let rafId = 0;
        let mounted = true;

        const tick = (time) => {
            if (!mounted) return;

            animsRef.current.forEach((anim, key) => {
                const m = materialRefs.current[key];
                if (!m) return;

                const elapsed = time - anim.start;
                if (elapsed < 0) return;

                const duration = anim.duration || 600;
                const t = Math.max(0, Math.min(1, elapsed / duration));
                const eased = t * t * (3 - 2 * t);

                const iso = key.split("-")[0];
                const col = getColorByIso(iso, nations);
                if (col) {
                    const c = new THREE.Color();
                    c.set(col);
                    m.color.copy(c);
                }

                if (anim.type === "in") {
                    m.opacity = Math.max(0, Math.min(opacity, opacity * eased));
                } else {
                    m.opacity = Math.max(
                        0,
                        Math.min(opacity, opacity * (1 - eased))
                    );
                }

                if (t >= 1) {
                    if (anim.type === "in") m.opacity = opacity;
                    else m.opacity = 0;
                    animsRef.current.delete(key);
                }
            });

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        return () => {
            mounted = false;
            cancelAnimationFrame(rafId);
        };
    }, [opacity, nations, meshesByIso]);

    if (!geo || !activeGroups.length) return null;

    return (
        <group>
            {activeGroups.map(({ iso }) => {
                const geometries = meshesByIso.get(iso) || [];
                return (
                    <group key={iso} visible={geometries.length > 0}>
                        {geometries.map((geometry, i) => (
                            <mesh
                                key={`${iso}-${i}`}
                                geometry={geometry}
                                renderOrder={10}
                            >
                                <meshBasicMaterial
                                    ref={(el) =>
                                        (materialRefs.current[`${iso}-${i}`] =
                                            el)
                                    }
                                    color={getColorByIso(iso, nations)}
                                    transparent={true}
                                    opacity={0}
                                    side={THREE.DoubleSide}
                                    depthWrite={false}
                                    depthTest={true}
                                    toneMapped={false}
                                />
                            </mesh>
                        ))}
                    </group>
                );
            })}
        </group>
    );
}
