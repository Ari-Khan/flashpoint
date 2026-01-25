import { useMemo, useState, useEffect, useRef } from "react";
import Arc from "./Arc.jsx";

export default function ArcManager({ events, nations, currentTime }) {
  const [liveLaunchIds, setLiveLaunchIds] = useState(new Set());
  const processedEvents = useRef(new Set());
  const prevTimeRef = useRef(currentTime);

  useEffect(() => {
    if (currentTime < prevTimeRef.current) {
      processedEvents.current.clear();
      setLiveLaunchIds(new Set());
    }
    prevTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (!events) return;

    let hasNew = false;
    const newBatch = new Set(liveLaunchIds);

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.type !== "launch") continue;

      const id = `${e.from}-${e.to}-${e.t}`;
      if (currentTime >= e.t && !processedEvents.current.has(id)) {
        newBatch.add(id);
        processedEvents.current.add(id);
        hasNew = true;
      }
    }

    if (hasNew) {
      setLiveLaunchIds(newBatch);
    }
  }, [currentTime, events]);

  const handleComplete = (id) => {
    setLiveLaunchIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const activeEvents = useMemo(() => {
    if (!events) return [];
    return events.filter(e => liveLaunchIds.has(`${e.from}-${e.to}-${e.t}`));
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