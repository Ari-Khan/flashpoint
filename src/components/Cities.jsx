import React, { useMemo } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3.js";

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
          size: 0.004
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
            size: 0.003
          });
        }
      });
    }
    return out;
  }, [nations]);

  return (
    <group>
      {spots.map(s => {
        const pos = latLonToVec3(s.lat, s.lon, 1.001);

        const computedColor = s.color || "#ffffff";

        const radius = Math.max(0.0005, s.size ?? 0.002);

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
