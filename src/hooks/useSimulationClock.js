import { useEffect, useState, useRef } from "react";

export function useSimulationClock(
    currentTick,
    tickStep,
    timePerStep,
    isPaused = false
) {
    const [displayTick, setDisplayTick] = useState(currentTick);
    const lastTickTimeRef = useRef(0);
    const frameRef = useRef();

    useEffect(() => {
        if (lastTickTimeRef.current === 0) {
            lastTickTimeRef.current = performance.now();
        }
    }, []);

    useEffect(() => {
        lastTickTimeRef.current = performance.now();
        if (isPaused) setDisplayTick(currentTick);
    }, [currentTick, isPaused]);

    useEffect(() => {
        if (isPaused) return;

        const update = () => {
            const elapsed = performance.now() - lastTickTimeRef.current;
            const progress = Math.min(1, elapsed / timePerStep);
            const nextTick = currentTick + progress * tickStep;

            setDisplayTick(nextTick);
            frameRef.current = requestAnimationFrame(update);
        };

        frameRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frameRef.current);
    }, [currentTick, tickStep, timePerStep, isPaused]);

    return displayTick;
}
