import { useState, useEffect, useRef } from "react";

export function useSimulationClock(currentTick, tickStep, timePerStep, smoothMode) {
  const [displayTick, setDisplayTick] = useState(currentTick);
  const lastTickTimeRef = useRef(performance.now());

  useEffect(() => {
    lastTickTimeRef.current = performance.now();
    if (smoothMode === "off") {
      setDisplayTick(currentTick);
    }
  }, [currentTick, smoothMode]);

  useEffect(() => {
    if (smoothMode === "off") return;

    let rafId;
    const update = () => {
      const elapsed = performance.now() - lastTickTimeRef.current;
      const progress = Math.min(1, elapsed / timePerStep);
      
      setDisplayTick(currentTick + (progress * tickStep));
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [smoothMode, currentTick, tickStep, timePerStep]);

  return displayTick;
}