import * as THREE from "three";

const DEG2RAD = Math.PI / 180;

export function latLonToVec3(
    lat,
    lon,
    radius = 1,
    target = new THREE.Vector3()
) {
    const phi = (90 - lat) * DEG2RAD;
    const theta = (lon + 180) * DEG2RAD;

    const sinPhi = Math.sin(phi);

    return target.set(
        -radius * sinPhi * Math.cos(theta),
        radius * Math.cos(phi),
        radius * sinPhi * Math.sin(theta)
    );
}
