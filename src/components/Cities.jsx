import React, { useMemo } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3";

export default function Cities({ nations = {} }) {
  const spots = useMemo(() => {
    const out = [];
    for (const [code, N] of Object.entries(nations)) {
      if (!N) continue;
      
      if (N.lat !== undefined && N.lon !== undefined) {
        out.push({
          key: `${code}-capital`,
          name: N.capital ?? N.name,
          lat: N.lat,
          lon: N.lon,
          color: N.defaultColor ?? "#ffffff",
          size: 0.0035
        });
      }

      
      (N.majorCities || []).forEach((c, idx) => {
        if (c && c.lat !== undefined && c.lon !== undefined) {
          out.push({
            key: `${code}-major-${idx}`,
            name: c.name,
            lat: c.lat,
            lon: c.lon,
            color: N.defaultColor ?? "#ffffff",
            size: 0.0028
          });
        }
      });
    }
    return out;
  }, [nations]);

  return (
    <group>
      {spots.map(s => {
        const pos = latLonToVec3(s.lat, s.lon, 1.002);

        
        const col = new THREE.Color(s.color || "#ffffff");
        const hsl = { h: 0, s: 0, l: 0 };
        col.getHSL(hsl);
        if (hsl.l < 0.25) col.setHSL(hsl.h, hsl.s, 0.25);
        const computedColor = `#${col.getHexString()}`;

        
        const radius = 0.002;

        return (
          <mesh key={s.key} position={pos}>
            <sphereGeometry args={[radius, 8, 8]} />
            <meshBasicMaterial color={computedColor} transparent opacity={1} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}
