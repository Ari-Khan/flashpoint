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
            
            // Validate nations exist and have valid coordinates
            if (!from || !to) return null;
            if (typeof from.lat !== 'number' || typeof from.lon !== 'number') return null;
            if (typeof to.lat !== 'number' || typeof to.lon !== 'number') return null;
            if (isNaN(from.lat) || isNaN(from.lon)) return null;
            if (isNaN(to.lat) || isNaN(to.lon)) return null;

            // random offset so it’s not center-to-center
            const seed = e.t + i;
            const jitter = (n) => (Math.sin(seed + n) * 0.5);

            return (
            <Arc
                key={`${e.from}-${e.to}-${e.t}-${i}`}
                fromLat={from.lat + jitter(1)}
                fromLon={from.lon + jitter(2)}
                toLat={to.lat + jitter(3)}
                toLon={to.lon + jitter(4)}
                weapon={e.weapon}
                startTime={e.t}
                currentTime={currentTime}
            />
            );
        })}
        </>
  );
}
