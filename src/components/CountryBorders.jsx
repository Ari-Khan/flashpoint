import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3.js";
import { useCountriesGeo } from "../hooks/useCountriesGeo.js";

export default function CountryBorders() {
    const geo = useCountriesGeo();

    const mergedGeometry = useMemo(() => {
        if (!geo?.features) return null;

        const rawPoints = [];
        const features = geo.features;

        for (let f = 0; f < features.length; f++) {
            const { coordinates, type } = features[f].geometry || {};
            if (!coordinates) continue;

            const polygons = type === "Polygon" ? [coordinates] : coordinates;

            for (let p = 0; p < polygons.length; p++) {
                const polygon = polygons[p];
                for (let r = 0; r < polygon.length; r++) {
                    const ring = polygon[r];
                    for (let i = 0; i < ring.length - 1; i++) {
                        const p1 = ring[i];
                        const p2 = ring[i + 1];

                        const v1 = latLonToVec3(p1[1], p1[0], 1.002);
                        const v2 = latLonToVec3(p2[1], p2[0], 1.002);

                        rawPoints.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
                    }
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(rawPoints, 3)
        );
        return geometry;
    }, [geo]);

    useEffect(() => {
        return () => mergedGeometry?.dispose();
    }, [mergedGeometry]);

    if (!mergedGeometry) return null;

    return (
        <lineSegments geometry={mergedGeometry}>
            <lineBasicMaterial
                color="#ffffff"
                opacity={0.3}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </lineSegments>
    );
}
