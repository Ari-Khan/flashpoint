import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3.js";

export default function Cities({ nations = {} }) {
  const meshRef = useRef();
  const bloomRef = useRef();

  const spots = useMemo(() => {
    const out = [];
    for (const [code, N] of Object.entries(nations)) {
      if (!N) continue;
      
      if (N.lat !== undefined && N.lon !== undefined) {
        out.push({
          pos: latLonToVec3(N.lat, N.lon, 1.001),
          color: new THREE.Color(N.defaultColor ?? "#ffffff"),
          size: N.size ?? 0.003
        });
      }

      (N.majorCities || []).forEach((c) => {
        if (c?.lat !== undefined && c?.lon !== undefined) {
          out.push({
            pos: latLonToVec3(c.lat, c.lon, 1.001),
            color: new THREE.Color(N.defaultColor ?? "#ffffff"),
            size: c.size ?? 0.002
          });
        }
      });
    }
    return out;
  }, [nations]);

  useEffect(() => {
    if (!meshRef.current || !bloomRef.current || spots.length === 0) return;

    const dummy = new THREE.Object3D();
    spots.forEach((s, i) => {
      dummy.position.copy(s.pos);
      dummy.scale.setScalar(s.size); 
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, s.color);

      dummy.scale.setScalar(s.size * 2);
      dummy.updateMatrix();
      bloomRef.current.setMatrixAt(i, dummy.matrix);
      bloomRef.current.setColorAt(i, s.color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    
    bloomRef.current.instanceMatrix.needsUpdate = true;
    if (bloomRef.current.instanceColor) bloomRef.current.instanceColor.needsUpdate = true;
  }, [spots]);

  return (
    <group>
      <instancedMesh ref={meshRef} args={[null, null, spots.length]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial transparent opacity={1} depthWrite={false} />
      </instancedMesh>

      <instancedMesh ref={bloomRef} args={[null, null, spots.length]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial 
          transparent 
          opacity={0.25} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </instancedMesh>
    </group>
  );
}