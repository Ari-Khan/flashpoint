import React, { useMemo, useState, useEffect, useRef } from "react";
import Arc from "./Arc.jsx";

export default function ArcManager({ events, nations, currentTime }) {
  const [liveLaunchIds, setLiveLaunchIds] = useState(new Set());
  const processedEvents = useRef(new Set());

  useEffect(() => {
    if (currentTime <= 0) {
      processedEvents.current.clear();
      setLiveLaunchIds(new Set());
    }
  }, [currentTime]);

  useEffect(() => {
    const newLaunches = (events ?? []).filter(e => {
      const id = `${e.from}-${e.to}-${e.t}`;
      return e.type === "launch" && 
             currentTime >= e.t && 
             !processedEvents.current.has(id);
    });

    if (newLaunches.length > 0) {
      setLiveLaunchIds(prev => {
        const next = new Set(prev);
        newLaunches.forEach(e => {
          const id = `${e.from}-${e.to}-${e.t}`;
          next.add(id);
          processedEvents.current.add(id);
        });
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