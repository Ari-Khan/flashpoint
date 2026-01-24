import { useMemo, useState, useEffect } from "react";
import Arc from "./Arc.jsx";

export default function ArcManager({ events, nations, currentTime }) {
    const [liveLaunchIds, setLiveLaunchIds] = useState(new Set());

    useEffect(() => {
        const newLaunches = (events ?? []).filter(e => 
            e.type === "launch" && 
            currentTime >= e.t && 
            currentTime < e.t + 1
        );

        if (newLaunches.length > 0) {
            const id = setTimeout(() => setLiveLaunchIds(prev => {
                const next = new Set(prev);
                newLaunches.forEach(e => next.add(`${e.from}-${e.to}-${e.t}`));
                return next;
            }), 0);
            return () => clearTimeout(id);
        }
    }, [currentTime, events]);

    const handleComplete = (id) => {
        setLiveLaunchIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const activeEvents = useMemo(() => {
        return (events ?? []).filter(e => liveLaunchIds.has(`${e.from}-${e.to}-${e.t}`));
    }, [events, liveLaunchIds]);

    return (
        <>
            {activeEvents.map((e) => {
                const from = nations[e.from];
                const to = nations[e.to];
                const id = `${e.from}-${e.to}-${e.t}`;
                if (!from || !to) return null;

                const fromLat = e.fromLat ?? from.lat;
                const fromLon = e.fromLon ?? from.lon;
                const toLat = e.toLat ?? to.lat;
                const toLon = e.toLon ?? to.lon;

                return (
                    <Arc
                        key={id}
                        id={id}
                        fromLat={fromLat}
                        fromLon={fromLon}
                        toLat={toLat}
                        toLon={toLon}
                        weapon={e.weapon}
                        startTime={e.t}
                        currentTime={currentTime}
                        onComplete={handleComplete}
                    />
                );
            })}
        </>
    );
}