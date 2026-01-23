import { useEffect, useMemo, useRef, useState } from "react";

export function useEventTimeline(events, timePerStep = 1000, tickStep = 1, isPaused = false) {
    const [visible, setVisible] = useState([]);
    const [currentTick, setCurrentTick] = useState(0);
    const currentRef = useRef(0);
    const prevEventsRef = useRef(null);

    const step = tickStep > 0 ? tickStep : 1;

    const { minT, maxT, byTick } = useMemo(() => {
        if (!events?.length) return { minT: 0, maxT: 0, byTick: new Map() };
        const buckets = new Map();
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        for (const e of events) {
            const tVal = Number(e.t ?? 0);
            if (Number.isNaN(tVal)) continue;
            const arr = buckets.get(tVal) || [];
            arr.push(e);
            buckets.set(tVal, arr);
            if (tVal < min) min = tVal;
            if (tVal > max) max = tVal;
        }
        if (min === Number.POSITIVE_INFINITY) {
            min = 0;
            max = 0;
        }
        return { minT: min, maxT: max, byTick: buckets };
    }, [events]);

    useEffect(() => {
        if (!events?.length) {
            setVisible([]);
            setCurrentTick(0);
            currentRef.current = 0;
            prevEventsRef.current = null;
            return;
        }

        if (prevEventsRef.current !== events) {
            prevEventsRef.current = events;
            setVisible(byTick.get(minT) ?? []);
            setCurrentTick(minT);
            currentRef.current = minT;
        }
    }, [events, minT, byTick]);

    useEffect(() => {
        if (!events?.length) return;
        if (isPaused) return;
        if (currentRef.current >= maxT) return;

        const interval = setInterval(() => {
            const next = Number((currentRef.current + step).toFixed(6));
            if (next > maxT) {
                clearInterval(interval);
                return;
            }
            currentRef.current = next;
            setCurrentTick(next);
            const bucket = byTick.get(next) ?? [];
            if (bucket.length) {
                setVisible((v) => [...v, ...bucket]);
            }
        }, timePerStep);

        return () => {
            clearInterval(interval);
        };
    }, [events, maxT, byTick, timePerStep, step, isPaused, minT]);

    return { visible, currentTick };
}
