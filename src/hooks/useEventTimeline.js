import { useEffect, useState } from "react";

export function useEventTimeline(events, timePerStep = 1000) {
    const [visible, setVisible] = useState([]);

    useEffect(() => {
        if (!events?.length) return;

        setVisible([]);
        let i = 0;

        const interval = setInterval(() => {
            setVisible((v) => [...v, events[i]]);
            i++;
            if (i >= events.length) clearInterval(interval);
        }, timePerStep);

        return () => clearInterval(interval);
    }, [events, timePerStep]);

    return { visible };
}
