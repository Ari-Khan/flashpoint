import { useEffect, useMemo, useState, useRef } from "react";

export function useEventTimeline(
    events,
    timePerStep = 1000,
    tickStep = 1,
    isPaused = false
) {
    const [currentTick, setCurrentTick] = useState(0);
    const lastTickRef = useRef(0);

    const { minT, maxT, sortedEvents } = useMemo(() => {
        if (!events || events.length === 0) {
            return { minT: 0, maxT: 0, sortedEvents: [] };
        }

        const sorted = [...events].sort((a, b) => a.t - b.t);
        const min = sorted[0].t;
        const max = sorted[sorted.length - 1].t;

        return { minT: min, maxT: max, sortedEvents: sorted };
    }, [events]);

    useEffect(() => {
        setCurrentTick(minT);
        lastTickRef.current = minT;
    }, [events, minT]);

    useEffect(() => {
        if (!events?.length || isPaused) return;

        let raf;
        let lastTime = performance.now();

        const update = () => {
            if (lastTickRef.current >= maxT) {
                return;
            }

            const now = performance.now();
            const delta = now - lastTime;
            lastTime = now;

            const progress = (delta / timePerStep) * tickStep;

            setCurrentTick((prev) => {
                const next = prev + progress;
                const result = next >= maxT ? maxT : next;
                lastTickRef.current = result;
                return result;
            });

            raf = requestAnimationFrame(update);
        };

        raf = requestAnimationFrame(update);
        return () => {
            if (raf) cancelAnimationFrame(raf);
        };
    }, [events, isPaused, maxT, timePerStep, tickStep]);

    const visible = useMemo(() => {
        const results = [];
        for (let i = 0; i < sortedEvents.length; i++) {
            const e = sortedEvents[i];
            if (e.t <= currentTick) {
                results.push(e);
            } else {
                break;
            }
        }
        return results;
    }, [sortedEvents, currentTick]);

    return { visible, currentTick, isFinished: currentTick >= maxT };
}
