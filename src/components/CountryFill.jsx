import * as THREE from "three";
import earcut from "earcut";
import { latLonToVec3 } from "../utils/latLonToVec3";
// You'll need to install this or import from three/examples
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";

export default function CountryFill({ feature, color, opacity }) {
  if (!feature) return null;

  const meshes = [];
  const geom = feature.geometry;

  function buildMesh(ring, holes = []) {
    if (!ring || ring.length < 3) return;

    const vertices2D = [];
    const holeIndices = [];

    // 1. Prepare 2D vertices for Earcut
    ring.forEach(([lon, lat]) => vertices2D.push(lon, lat));
    holes.forEach(hole => {
      holeIndices.push(vertices2D.length / 2);
      hole.forEach(([lon, lat]) => vertices2D.push(lon, lat));
    });

    // 2. Triangulate
    const indices = earcut(vertices2D, holeIndices);

    // 3. Create a temporary "Flat" geometry (X=lon, Y=lat)
    const geometry = new THREE.BufferGeometry();
    const flatPositions = new Float32Array((vertices2D.length / 2) * 3);
    for (let i = 0, j = 0; i < vertices2D.length; i += 2, j += 3) {
      flatPositions[j] = vertices2D[i];
      flatPositions[j + 1] = vertices2D[i + 1];
      flatPositions[j + 2] = 0; // Keep it flat for the modifier
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(flatPositions, 3));
    geometry.setIndex(indices);

    // 4. Subdivide (Tessellate)
    // maxEdgeLength: smaller number = more detail (try 1.0 to 2.0)
    // maxIterations: prevents the browser from crashing on complex shapes
    const tessellate = new TessellateModifier(1.5, 6);
    let subdividedGeom = tessellate.modify(geometry);

    // 5. Project the NEW subdivided points onto the sphere
    const posAttr = subdividedGeom.getAttribute("position");
    for (let i = 0; i < posAttr.count; i++) {
      const lon = posAttr.getX(i);
      const lat = posAttr.getY(i);
      
      // Project to 3D spherical space
      const v = latLonToVec3(lat, lon, 1.001);
      posAttr.setXYZ(i, v.x, v.y, v.z);
    }

    subdividedGeom.computeVertexNormals();

    meshes.push(
      <mesh key={meshes.length} geometry={subdividedGeom}>
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

  // Handle Polygon/MultiPolygon
  if (geom.type === "Polygon") {
    buildMesh(geom.coordinates[0], geom.coordinates.slice(1));
  } else if (geom.type === "MultiPolygon") {
    geom.coordinates.forEach(poly => {
      buildMesh(poly[0], poly.slice(1));
    });
  }

  return <group>{meshes}</group>;
}