import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import Globe from "../components/Globe";
import CountryBorders from "../components/CountryBorders";
import ControlPanel from "../components/ControlPanel";
import CountryFillManager from "../components/CountryFillManager";
import Skybox from "../components/Skybox";
import Atmosphere from "../components/Atmosphere";

import { useEventTimeline } from "../hooks/useEventTimeline";
import { loadWorld } from "../data/loadData";
import { simulateEscalation } from "../sim/simulateEscalation";

import "../index.css";

const world = loadWorld();

export default function App() {
  const [events, setEvents] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);

  // timeline.visible is the ONLY source of truth
  const { visible } = useEventTimeline(events, 1000);

  function run(actor, target) {
    const rawTimeline = simulateEscalation({
      initiator: actor,
      firstTarget: target,
      world
    });

    setEvents(rawTimeline);
    setCurrentTime(0);
  }

  // ✅ Update currentTime safely
  useEffect(() => {
    if (!visible.length) return;
    const last = visible[visible.length - 1];
    setCurrentTime(last.t);
  }, [visible]);

  // ✅ Derive affected countries from visible events
  const affectedIso2 = useMemo(() => {
    if (!visible.length) return [];

    return [
      ...new Set(
        visible
          .filter(e => e.type === "launch")
          .flatMap(e => [
            world.nations[e.from]?.iso2,
            world.nations[e.to]?.iso2
          ])
          .filter(Boolean)
      )
    ];
  }, [visible]);

  return (
    <div className="app-container">
      <ControlPanel nations={world.nations} onRun={run} />

      {/* Time Display */}
      {events && (
        <div className="time-display">
          T+{currentTime}
        </div>
      )}

      {visible.length > 0 && (
        <pre className="event-log">
          {JSON.stringify(visible, null, 2)}
        </pre>
      )}

      <Canvas
        className="canvas-3d"
        camera={{ position: [0, 0, 2], fov: 65 }}
      >
        <Skybox />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} />

        <CountryBorders />
        <Globe />
        <Atmosphere />

        <CountryFillManager
          activeIso2={affectedIso2}
          nations={world.nations}
        />

        <OrbitControls
          enableZoom
          enablePan={false}
          enableRotate
          enableDamping
          touches={{
            ONE: 2,
            TWO: 0
          }}
          minDistance={1.2}
          maxDistance={4}
        />
      </Canvas>
    </div>
  );
}
