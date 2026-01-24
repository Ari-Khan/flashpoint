import { useState, useEffect, useRef } from "react";

export function useSimulationClock(currentTick, tickStep, timePerStep, smoothMode) {
  const [displayTick, setDisplayTick] = useState(0);
  const lastTickTimeRef = useRef(0);

  useEffect(() => {
    lastTickTimeRef.current = performance.now();
  }, [currentTick]);

  useEffect(() => {
    if (smoothMode === "off") {
      setDisplayTick(currentTick);
      return;
    }

    let rafId;
    const tick = () => {
      const elapsed = performance.now() - lastTickTimeRef.current;
      const factor = Math.min(1, elapsed / timePerStep);
      setDisplayTick(currentTick + factor * tickStep);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [smoothMode, currentTick, tickStep, timePerStep]);

  return displayTick;
}