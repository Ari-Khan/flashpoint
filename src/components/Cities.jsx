import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3.js";

const DUMMY = new THREE.Object3D();
const LOW_POLY_SPHERE = new THREE.IcosahedronGeometry(1, 1);

export default function Cities({ nations = {} }) {
    const meshRef = useRef();
    const bloomRef = useRef();

    const spots = useMemo(() => {
        const out = [];
        const nationEntries = Object.entries(nations);

        for (let i = 0; i < nationEntries.length; i++) {
            const [key, N] = nationEntries[i];
            if (!N) continue;

            const baseColor = new THREE.Color(N.defaultColor ?? "#ffffff");

            if (N.lat !== undefined && N.lon !== undefined) {
                out.push({
                    pos: latLonToVec3(N.lat, N.lon, 1.001),
                    color: baseColor,
                    size: N.size ?? 0.003,
                });
            }

            const cities = N.majorCities;
            if (cities) {
                for (let j = 0; j < cities.length; j++) {
                    const c = cities[j];
                    if (c?.lat !== undefined && c?.lon !== undefined) {
                        out.push({
                            pos: latLonToVec3(c.lat, c.lon, 1.001),
                            color: baseColor,
                            size: c.size ?? 0.002,
                        });
                    }
                }
            }
        }
        return out;
    }, [nations]);

    useEffect(() => {
        const mesh = meshRef.current;
        const bloom = bloomRef.current;
        if (!mesh || !bloom || spots.length === 0) return;

        for (let i = 0; i < spots.length; i++) {
            const s = spots[i];

            DUMMY.position.copy(s.pos);

            DUMMY.scale.setScalar(s.size);
            DUMMY.updateMatrix();
            mesh.setMatrixAt(i, DUMMY.matrix);
            mesh.setColorAt(i, s.color);

            DUMMY.scale.setScalar(s.size * 2.2);
            DUMMY.updateMatrix();
            bloom.setMatrixAt(i, DUMMY.matrix);
            bloom.setColorAt(i, s.color);
        }

        mesh.instanceMatrix.needsUpdate = true;
        bloom.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        if (bloom.instanceColor) bloom.instanceColor.needsUpdate = true;
    }, [spots]);

    return (
        <group>
            <instancedMesh
                ref={meshRef}
                args={[LOW_POLY_SPHERE, null, spots.length]}
            >
                <meshBasicMaterial transparent depthWrite={false} />
            </instancedMesh>

            <instancedMesh
                ref={bloomRef}
                args={[LOW_POLY_SPHERE, null, spots.length]}
            >
                <meshBasicMaterial
                    transparent
                    opacity={0.3}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>
        </group>
    );
}
