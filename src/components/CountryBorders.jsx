import { useEffect, useState } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3";

export default function CountryBorders() {
    const [lines, setLines] = useState([]);

    useEffect(() => {
        fetch("/src/data/country-shapes.geo.json")
            .then((res) => res.json())
            .then((data) => {
                const newLines = [];

                data.features.forEach((feature) => {
                    const { coordinates, type } = feature.geometry;

                    const processPolygon = (polygon) => {
                        polygon.forEach((ring) => {
                            const points = ring.map(
                                ([lon, lat]) => latLonToVec3(lat, lon, 1.001), // slightly above globe
                            );

                            const geometry =
                                new THREE.BufferGeometry().setFromPoints(
                                    points,
                                );
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
            });
    }, []);

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
