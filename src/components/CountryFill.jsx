import * as THREE from "three";
import { latLonToVec3 } from "../utils/latLonToVec3";

export default function CountryFill({ feature, color, opacity }) {
  if (!feature) return null;

  const meshes = [];

  const geom = feature.geometry;

  function buildMesh(ring) {
    if (ring.length < 3) return;

    // triangulate in 2D lat/lon space
    const shape = new THREE.Shape(
      ring.map(([lon, lat]) => new THREE.Vector2(lon, lat))
    );

    const geometry2D = new THREE.ShapeGeometry(shape);

    // project vertices onto sphere
    const pos = geometry2D.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const lon = pos.getX(i);
      const lat = pos.getY(i);
      const v = latLonToVec3(lat, lon, 1.002);
      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geometry2D.computeVertexNormals();

    meshes.push(
      <mesh key={meshes.length} geometry={geometry2D}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    );
  }

  if (geom.type === "Polygon") {
    geom.coordinates.forEach(buildMesh);
  } else if (geom.type === "MultiPolygon") {
    geom.coordinates.forEach(poly =>
      poly.forEach(buildMesh)
    );
  }

  return <group>{meshes}</group>;
}
