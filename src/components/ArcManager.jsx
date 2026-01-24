import { useMemo } from "react";
import Arc from "./Arc";

export default function ArcManager({ events, nations, currentTime }) {
    const launchEvents = useMemo(
        () => (events ?? []).filter(e => e.type === "launch"),
        [events]
    );

    return (
        <>
            {launchEvents.map((e, i) => {
                const from = nations[e.from];
                const to = nations[e.to];

                if (!from || !to) return null;

                return (
                    <Arc
                        key={`${e.from}-${e.to}-${e.t}-${i}`}
                        fromLat={from.lat} 
                        fromLon={from.lon}
                        toLat={to.lat}
                        toLon={to.lon}
                        weapon={e.weapon}
                        startTime={e.t}
                        currentTime={currentTime}
                    />
                );
            })}
        </>
    );
}