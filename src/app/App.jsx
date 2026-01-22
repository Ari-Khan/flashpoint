import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import Globe from "../components/Globe";
import CountryBorders from "../components/CountryBorders";
import ControlPanel from "../components/ControlPanel";

import { loadWorld } from "../data/loadData";
import { simulateEscalation } from "../sim/simulateEscalation";

import "../index.css";

const world = loadWorld();

export default function App() {
  const [events, setEvents] = useState(null);

  function run(actor, target) {
    const timeline = simulateEscalation({
      initiator: actor,
      firstTarget: target,
      world
    });

    setEvents(timeline);
  }

  return (
    <div className="app-container">
      {/* UI Overlay */}
      <ControlPanel nations={world.nations} onRun={run} />

      {events && (
        <pre
          style={{
            position: "fixed",
            right: "16px",
            bottom: "16px",
            maxWidth: "420px",
            maxHeight: "60vh",
            overflow: "auto",
            background: "#000",
            color: "#0f0",
            padding: "12px",
            borderRadius: "8px",
            zIndex: 1000
          }}
        >
{JSON.stringify(events, null, 2)}
        </pre>
      )}

      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, 0, 2], fov: 65 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} />

        <CountryBorders />
        <Globe />

        <OrbitControls enableZoom minDistance={1.2} maxDistance={4} />
      </Canvas>
    </div>
  );
}
