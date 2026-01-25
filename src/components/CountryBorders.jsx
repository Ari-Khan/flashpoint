import { useEffect, useState } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3.js";
import { useCountriesGeo } from "../data/useCountriesGeo.js";

export default function CountryBorders() {
    const [lines, setLines] = useState([]);
    const geo = useCountriesGeo();

    useEffect(() => {
        if (!geo || !geo.features) {
            setLines([]);
            return;
        }

        const newLines = [];

        geo.features.forEach((feature) => {
            const { coordinates, type } = feature.geometry || {};
            if (!coordinates) return;

            const processPolygon = (polygon) => {
                polygon.forEach((ring) => {
                    const points = ring.map(([lon, lat]) => latLonToVec3(lat, lon, 1.001));

                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    newLines.push(geometry);
                });
            };

            if (type === "Polygon") {
                processPolygon(coordinates);
            }

            if (type === "MultiPolygon") {
                coordinates.forEach(processPolygon);
            }
        });

        setLines(newLines);
    }, [geo]);

    return (
        <>
            {lines.map((geo, i) => (
                <line key={i} geometry={geo}>
                    <lineBasicMaterial
                        color="#ffffff"
                        opacity={0.6}
                        transparent
                    />
                </line>
            ))}
        </>
    );
}
