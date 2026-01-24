import { useEffect, useMemo, useState } from "react";
import cfg from "../config/settings.js";

export function useEventTimeline(events, timePerStep = 1000, tickStep, isPaused = false) {
    const [currentTick, setCurrentTick] = useState(0);
    const step = typeof tickStep === "number" && tickStep > 0 ? tickStep : (cfg.tickStep ?? 1);

    const { minT, maxT } = useMemo(() => {
        if (!events?.length) return { minT: 0, maxT: 0 };
        const times = events.map(e => Number(e.t || 0));
        return { minT: Math.min(...times), maxT: Math.max(...times) };
    }, [events]);

    const visible = useMemo(() => {
        if (!events?.length) return [];
        return events.filter(e => Number(e.t) <= currentTick);
    }, [events, currentTick]);

    useEffect(() => {
        setCurrentTick(minT);
    }, [events, minT]);

    useEffect(() => {
        if (!events?.length || isPaused || currentTick >= maxT) return;

        const interval = setInterval(() => {
            setCurrentTick(prev => {
                const next = prev + step;
                return next >= maxT ? maxT : next;
            });
        }, timePerStep);

        return () => clearInterval(interval);
    }, [events, isPaused, maxT, timePerStep, step]);

    return { visible, currentTick };
}