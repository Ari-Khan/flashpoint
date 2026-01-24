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
            setLiveLaunchIds(prev => {
                const next = new Set(prev);
                newLaunches.forEach(e => next.add(`${e.from}-${e.to}-${e.t}`));
                return next;
            });
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
        <group>
            {activeEvents.map((e) => {
                const from = nations[e.from];
                const to = nations[e.to];
                const id = `${e.from}-${e.to}-${e.t}`;
                if (!from || !to) return null;

                return (
                    <Arc
                        key={id}
                        id={id}
                        fromLat={e.fromLat ?? from.lat}
                        fromLon={e.fromLon ?? from.lon}
                        toLat={e.toLat ?? to.lat}
                        toLon={e.toLon ?? to.lon}
                        weapon={e.weapon}
                        startTime={e.t}
                        currentTime={currentTime}
                        onComplete={handleComplete}
                    />
                );
            })}
        </group>
    );
}