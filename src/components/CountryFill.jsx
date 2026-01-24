import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import earcut from "earcut";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";
import { latLonToVec3 } from "../utils/latLonToVec3";
import { getCountryKey } from "../utils/countryUtils";

const GEOMETRY_CACHE = new Map();

export default function CountryFill({ feature, color, opacity = 1 }) {
    const countryKey = feature ? getCountryKey(feature) : null;

    const meshes = useMemo(() => {
        if (!feature) return [];
        if (GEOMETRY_CACHE.has(countryKey)) {
            return GEOMETRY_CACHE.get(countryKey);
        }

        const internalMeshes = [];
        const geom = feature.geometry;

        function buildMesh(rings) {
            if (!rings || rings.length === 0 || rings[0].length < 3) return;

            const vertices2D = [];
            const holeIndices = [];
            let centerLon = 0;
            rings[0].forEach(([lon]) => {
                centerLon += lon;
            });
            centerLon /= rings[0].length;

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
                feature.properties?.name === "Russia" ||
                feature.properties?.iso_a3 === "RUS";
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
                new THREE.BufferAttribute(flatPositions, 3),
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
                const v = latLonToVec3(lat, lon, 1.001);
                posAttr.setXYZ(i, v.x, v.y, v.z);
            }

            geometry.computeVertexNormals();
            geometry.computeBoundingSphere();
            internalMeshes.push(geometry);
        }

        if (geom.type === "Polygon") {
            buildMesh(JSON.parse(JSON.stringify(geom.coordinates)));
        } else if (geom.type === "MultiPolygon") {
            geom.coordinates.forEach((poly) => buildMesh(JSON.parse(JSON.stringify(poly))));
        }

        GEOMETRY_CACHE.set(countryKey, internalMeshes);
        return internalMeshes;
    }, [feature, countryKey]);

    const [fadeOpacity, setFadeOpacity] = useState(0);

    useEffect(() => {
        let rafId;
        const start = performance.now();
        const duration = 1000;

        const animate = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = t * t * (3 - 2 * t);
            setFadeOpacity(opacity * eased);
            if (t < 1) rafId = requestAnimationFrame(animate);
        };

        rafId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId);
    }, [opacity, countryKey]);

    return (
        <group>
            {meshes.map((geometry, i) => (
                <mesh key={`${countryKey}-${i}`} geometry={geometry}>
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={fadeOpacity}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                        toneMapped={false}
                    />
                </mesh>
            ))}
        </group>
    );
}
