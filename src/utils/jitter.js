import { latLonToVec3 } from "./latLonToVec3";

export function getJitteredVec3(lat, lon, amount = 2, seed = 0) {
    const nLat = Number(lat);
    const nLon = Number(lon);
    const nSeed = Number(seed);

    const finalSeed = nLat * 133.7 + nLon * 42.3 + nSeed; 
    
    const jLat = nLat + Math.sin(finalSeed) * amount;
    const jLon = nLon + Math.cos(finalSeed) * amount;
    
    return latLonToVec3(jLat, jLon, 1.001); 
}