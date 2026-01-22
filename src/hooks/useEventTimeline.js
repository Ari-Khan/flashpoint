import { useEffect, useState } from "react";

export function useEventTimeline(events, timePerStep = 1000) {
  const [visible, setVisible] = useState([]);
  const [affectedCountries, setAffectedCountries] = useState(new Set());

  useEffect(() => {
    if (!events?.length) return;

    setVisible([]);
    setAffectedCountries(new Set());
    let i = 0;

    const interval = setInterval(() => {
      const event = events[i];
      setVisible(v => [...v, event]);

      // Track affected countries
      if (event.type === "launch") {
        setAffectedCountries(prev => {
          const next = new Set(prev);
          next.add(event.from);
          next.add(event.to);
          return next;
        });
      } else if (event.type === "faction-join" || event.type === "ally-join") {
        setAffectedCountries(prev => {
          const next = new Set(prev);
          next.add(event.country);
          return next;
        });
      }

      i++;
      if (i >= events.length) clearInterval(interval);
    }, timePerStep);

    return () => clearInterval(interval);
  }, [events, timePerStep]);

  return { visible, affectedCountries };
}
