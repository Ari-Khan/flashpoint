import { useEffect, useMemo, useState, useRef } from "react";

export function useEventTimeline(
    events,
    timePerStep = 1000,
    simSpeed = 1,
    isPaused = false,
    tps = 16
) {
    const [rawTick, setRawTick] = useState(0);
    const lastTickRef = useRef(0);

    const { minT, maxT, sortedEvents } = useMemo(() => {
        if (!events?.length) return { minT: 0, maxT: 0, sortedEvents: [] };
        const sorted = [...events].sort((a, b) => a.t - b.t);
        return {
            minT: sorted[0].t,
            maxT: sorted[sorted.length - 1].t,
            sortedEvents: sorted,
        };
    }, [events]);

    const currentTick = useMemo(() => {
        if (!tps) return rawTick;
        return Math.floor(rawTick / tps) * tps;
    }, [rawTick, tps]);

    useEffect(() => {
        if (events) setRawTick(minT);
    }, [events, minT]);

    useEffect(() => {
        if (!events?.length || isPaused) return;

        let raf;
        let lastTime = performance.now();

        const update = () => {
            if (lastTickRef.current >= maxT) return;

            const now = performance.now();
            const delta = now - lastTime;
            lastTime = now;

            const progress = (delta / timePerStep) * simSpeed;

            setRawTick((prev) => {
                const next = prev + progress;
                const result = next >= maxT ? maxT : next;
                lastTickRef.current = result;
                return result;
            });

            raf = requestAnimationFrame(update);
        };

        raf = requestAnimationFrame(update);
        return () => cancelAnimationFrame(raf);
    }, [events, isPaused, maxT, timePerStep, simSpeed]);

    const visible = useMemo(() => {
        const results = [];
        for (const e of sortedEvents) {
            if (e.t <= currentTick) results.push(e);
            else break;
        }
        return results;
    }, [sortedEvents, currentTick]);

    return { visible, currentTick, isFinished: rawTick >= maxT };
}
