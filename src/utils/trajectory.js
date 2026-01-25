import * as THREE from "three";
import { latLonToVec3 } from "./latLonToVec3.js";
import { getJitteredVec3 } from "./jitter.js";

export const TERMINAL_MULTIPLIER = 1.5;
export const SPEEDS = { icbm: 15, slbm: 18, air: 30 };

export function computeStartEndDistance({ fromLat, fromLon, toLat, toLon, startTime }) {
  const start = latLonToVec3(fromLat, fromLon, 1.001);
  const end = getJitteredVec3(Number(toLat), Number(toLon), 1.001, Number(startTime));
  const distance = start.distanceTo(end);
  return { start, end, distance };
}

export function computeDuration(distance, weapon) {
  const speed = SPEEDS[weapon] ?? 20;
  return Math.max(5, (distance * speed) / TERMINAL_MULTIPLIER);
}

export function computeImpactTick(t, duration) {
  return t + duration;
}

export function buildCubicCurveAndGeometry({ start, end, startTime }) {
  const seed = Number(startTime);
  const variance = (Math.sin(seed * 12.9898) * 0.03);
  const d = start.distanceTo(end);
  const h = Math.max(0.1, -0.4 + (d * 0.7)) + variance;

  let mid = new THREE.Vector3().addVectors(start, end).normalize();
  if (start.dot(end) < -0.9) {
    const axis = Math.abs(start.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    mid = new THREE.Vector3().crossVectors(start, axis).normalize();
  }

  const startDir = start.clone().normalize();
  const endDir = end.clone().normalize();
  const ctrl1 = new THREE.Vector3().lerpVectors(startDir, mid, 0.5).normalize().multiplyScalar(1.001 + h);
  const ctrl2 = new THREE.Vector3().lerpVectors(endDir, mid, 0.5).normalize().multiplyScalar(1.001 + h);

  const cubicCurve = new THREE.CubicBezierCurve3(start, ctrl1, ctrl2, end);

  const approxLength = start.distanceTo(ctrl1) + ctrl1.distanceTo(ctrl2) + ctrl2.distanceTo(end);
  const dynamicSegments = Math.min(600, Math.max(40, Math.ceil(approxLength * 150)));

  const pts = cubicCurve.getPoints(dynamicSegments);

  const arcLengths = new Float32Array(pts.length);
  let totalLen = 0;
  arcLengths[0] = 0;
  for (let i = 1; i < pts.length; i++) {
    totalLen += pts[i].distanceTo(pts[i - 1]);
    arcLengths[i] = totalLen;
  }
  if (totalLen > 0) {
    for (let i = 1; i < arcLengths.length; i++) arcLengths[i] /= totalLen;
  } else {
    for (let i = 1; i < arcLengths.length; i++) arcLengths[i] = i / (arcLengths.length - 1);
  }

  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  return {
    curve: cubicCurve,
    geometry: geom,
    arcLengths,
    pointsCount: pts.length,
    segments: dynamicSegments
  };
}

export function computeTrajectory({ fromLat, fromLon, toLat, toLon, startTime, weapon }) {
  const { start, end, distance } = computeStartEndDistance({ fromLat, fromLon, toLat, toLon, startTime });
  const duration = computeDuration(distance, weapon);
  const impactTick = computeImpactTick(Number(startTime), duration);
  return { start, end, distance, duration, impactTick };
}
