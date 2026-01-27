import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import earcut from "earcut";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";
import { latLonToVec3 } from "../utils/latLonToVec3.js";

const GEOMETRY_CACHE = new Map();

export default function CountryFill({
    features,
    countryCode,
    color,
    opacity = 1,
}) {
    const materialRefs = useRef([]);
    const countryColor = useMemo(() => new THREE.Color(color), [color]);
    const [isInitialized, setIsInitialized] = useState(false);

    const meshes = useMemo(() => {
        if (!features?.length || !countryCode) return [];
        if (GEOMETRY_CACHE.has(countryCode))
            return GEOMETRY_CACHE.get(countryCode);

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
                        Math.abs(vertices2D[a * 2] - vertices2D[b * 2]) >
                            maxDist ||
                        Math.abs(vertices2D[b * 2] - vertices2D[c * 2]) >
                            maxDist ||
                        Math.abs(vertices2D[c * 2] - vertices2D[a * 2]) >
                            maxDist
                    )
                        continue;
                    cleanIndices.push(a, b, c);
                }

                let geometry = new THREE.BufferGeometry();
                const flatPositions = new Float32Array(
                    (vertices2D.length / 2) * 3
                );
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
                    try {
                        geometry = new TessellateModifier(0.5, 4).modify(
                            geometry
                        );
                    } catch (e) {}
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
                geom.coordinates.forEach((polygonRings) =>
                    buildMesh(polygonRings)
                );
            }
        });

        GEOMETRY_CACHE.set(countryCode, internalGeometries);
        return internalGeometries;
    }, [features, countryCode]);

    useEffect(() => {
        let active = true;
        let rafId;

        const animate = (startTime) => {
            const duration = 600;
            const step = (now) => {
                if (!active) return;
                const elapsed = now - startTime;
                const t = Math.min(1, elapsed / duration);
                const eased = t * t * (3 - 2 * t);

                materialRefs.current.forEach((m) => {
                    if (m) {
                        m.opacity = opacity * eased;
                        m.color.copy(countryColor);
                    }
                });

                if (t < 1) rafId = requestAnimationFrame(step);
            };
            rafId = requestAnimationFrame(step);
        };

        rafId = requestAnimationFrame(() => {
            if (!active) return;
            setIsInitialized(true);
            animate(performance.now());
        });

        return () => {
            active = false;
            cancelAnimationFrame(rafId);
        };
    }, [countryCode, opacity, countryColor]);

    if (!features || meshes.length === 0) return null;

    return (
        <group visible={isInitialized}>
            {meshes.map((geometry, i) => (
                <mesh
                    key={`${countryCode}-${i}`}
                    geometry={geometry}
                    renderOrder={10}
                >
                    <meshBasicMaterial
                        ref={(el) => (materialRefs.current[i] = el)}
                        color={countryColor}
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
}
