import { useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3.js";
import { useCountriesGeo } from "../data/useCountriesGeo.js";

export default function CountryBorders() {
    const geo = useCountriesGeo();

    const mergedGeometry = useMemo(() => {
        if (!geo || !geo.features) return null;

        const points = [];
        geo.features.forEach((feature) => {
            const { coordinates, type } = feature.geometry || {};
            if (!coordinates) return;

            const processPolygon = (polygon) => {
                polygon.forEach((ring) => {
                    for (let i = 0; i < ring.length; i++) {
                        const [lon, lat] = ring[i];
                        const vec = latLonToVec3(lat, lon, 1.001);
                        points.push(vec);

                        if (i > 0 && i < ring.length - 1) {
                            points.push(vec);
                        }
                    }
                });
            };

            if (type === "Polygon") processPolygon(coordinates);
            else if (type === "MultiPolygon") coordinates.forEach(processPolygon);
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return geometry;
    }, [geo]);

    useEffect(() => {
        return () => {
            if (mergedGeometry) mergedGeometry.dispose();
        };
    }, [mergedGeometry]);

    if (!mergedGeometry) return null;

    return (
        <lineSegments geometry={mergedGeometry}>
            <lineBasicMaterial
                color="#ffffff"
                opacity={0.6}
                transparent
                depthWrite={false}
            />
        </lineSegments>
    );
}