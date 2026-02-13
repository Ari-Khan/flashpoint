import { useState, useEffect, useRef } from "react";

export function useSimulationClock(
    currentTick,
    tickStep,
    timePerStep,
    isPaused = false
) {
    const [displayTick, setDisplayTick] = useState(currentTick);
    const lastTickTimeRef = useRef(0);

    useEffect(() => {
        lastTickTimeRef.current = performance.now();

        if (isPaused) setDisplayTick(currentTick);
    }, [currentTick, isPaused]);

    useEffect(() => {
        if (isPaused) {
            setDisplayTick(currentTick);
            return;
        }

        let rafId;
        const update = () => {
            const elapsed = performance.now() - lastTickTimeRef.current;
            const progress = Math.min(1, elapsed / timePerStep);

            setDisplayTick(currentTick + progress * tickStep);
            rafId = requestAnimationFrame(update);
        };

        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [currentTick, tickStep, timePerStep, isPaused]);

    return displayTick;
}
