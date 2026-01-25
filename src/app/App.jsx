import { useMemo, useState, useRef, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import Globe from "../components/Globe.jsx";
import CountryBorders from "../components/CountryBorders.jsx";
import ControlPanel from "../components/ControlPanel.jsx";
import CountryFillManager from "../components/CountryFillManager.jsx";
import Skybox from "../components/Skybox.jsx";
import Atmosphere from "../components/Atmosphere.jsx";
import ExplosionManager from "../components/ExplosionManager.jsx";
import ArcManager from "../components/ArcManager.jsx";
import Cities from "../components/Cities.jsx";
import SettingsPanel from "../components/SettingsPanel.jsx";
import SmoothZoom from "../components/SmoothZoom.jsx";

import { useEventTimeline } from "../hooks/useEventTimeline.js";
import { useSimulationClock } from "../hooks/useSimulationClock.js";
import { loadWorld } from "../data/loadData.js";
import { simulateEscalation } from "../sim/simulateEscalation.js";

import "../index.css";
import perfCfg from "../config/settings.js";

const world = loadWorld();
const BASE_TICK_MS = 1000;

const TEXTURES = [
  "specular.avif",
  "topography.avif",
  "terrain.avif",
  "bathymetry.avif",
  "physical.avif",
  "night.avif",
];

export default function App() {
  const [events, setEvents] = useState(null);
  const [tickStep, setTickStep] = useState(perfCfg?.tickStep ?? 1);
  const [smoothMode, setSmoothMode] = useState("off");
  const [isPaused, setIsPaused] = useState(false);
  const controlsRef = useRef();
  const [zoomMode, setZoomMode] = useState("Smooth");
  const [showGeo, setShowGeo] = useState(false);

  // Defer mounting heavy/geo components to improve initial load
  useEffect(() => {
    const id = setTimeout(() => setShowGeo(true), 300);
    return () => clearTimeout(id);
  }, []);

  const timePerStep = BASE_TICK_MS * tickStep;

  const [performanceSettings, setPerformanceSettings] = useState(() => ({
    antialias: perfCfg?.antialias ?? true,
    pixelRatioLimit: perfCfg?.pixelRatioLimit ?? 2,
    powerPreference: perfCfg?.powerPreference ?? "high-performance",
    preserveDrawingBuffer: perfCfg?.preserveDrawingBuffer ?? false,
  }));

  const [earthTexture, setEarthTexture] = useState(TEXTURES[0] ?? "specular.avif");

  const { visible, currentTick } = useEventTimeline(events, timePerStep, tickStep, isPaused);
  const displayTick = useSimulationClock(currentTick, tickStep, timePerStep, smoothMode);

  const affectedIsos = useMemo(() => {
    const isoSet = new Set();
    for (let i = 0; i < visible.length; i++) {
      const e = visible[i];
      const ids = [e.from, e.to, e.attacker, e.target];
      for (let j = 0; j < ids.length; j++) {
        const id = ids[j];
        if (id) {
          isoSet.add(id.toUpperCase());
        }
      }
    }
    return Array.from(isoSet);
  }, [visible]);

  const visibleForLog = useMemo(() => {
    const logArray = [];
    for (let i = visible.length - 1; i >= 0; i--) {
      const { fromLat, fromLon, toLat, toLon, ...logFriendly } = visible[i];
      if (typeof logFriendly.intensity === "number") {
        logFriendly.intensity = Math.round(logFriendly.intensity * 10) / 10;
      }
      logArray.push(logFriendly);
    }
    return logArray;
  }, [visible]);

  function run(actor, target) {
    const rawTimeline = simulateEscalation({
      initiator: actor,
      firstTarget: target,
      world,
    });
    setEvents(rawTimeline);
  }

  return (
    <div className="app-container">
      <ControlPanel nations={world.nations} onRun={run} />
      <SettingsPanel
        tickStep={tickStep}
        onTickStepChange={setTickStep}
        smoothMode={smoothMode}
        onSmoothModeChange={setSmoothMode}
        performanceSettings={performanceSettings}
        onPerformanceChange={setPerformanceSettings}
        texture={earthTexture}
        onTextureChange={setEarthTexture}
        zoomMode={zoomMode}
        onZoomModeChange={setZoomMode}
      />

      <div className="time-controls">
        <button className="pause-button" onClick={() => setIsPaused(!isPaused)}>
          {isPaused ? "Resume" : "Pause"}
        </button>
        <div className="time-display">T+{Math.floor(displayTick)}</div>
      </div>

      <pre className="event-log">
        {visible.length ? JSON.stringify(visibleForLog, null, 2) : "No events yet"}
      </pre>

      <Canvas
        className="canvas-3d"
        camera={{ position: [0, 0, 2], fov: 65 }}
        dpr={[1, performanceSettings.pixelRatioLimit]}
        gl={{
          antialias: performanceSettings.antialias,
          powerPreference: performanceSettings.powerPreference,
          preserveDrawingBuffer: performanceSettings.preserveDrawingBuffer,
        }}
      >
        <Skybox />
        <ambientLight intensity={0.4} /> 
        <directionalLight position={[5, 5, 5]} intensity={1.0} />

        <Suspense fallback={null}>
          <ArcManager events={visible} nations={world.nations} currentTime={displayTick} />
          <ExplosionManager events={visible} nations={world.nations} currentTime={displayTick} />

          {showGeo && <CountryBorders />}
          {showGeo && <Cities nations={world.nations} />}
          {showGeo && <CountryFillManager activeIsos={affectedIsos} nations={world.nations} />}
        </Suspense>

        <Globe textureName={earthTexture} />
        <Atmosphere />

        <OrbitControls 
          ref={controlsRef} 
          enableZoom={zoomMode === "Block"}
          enableDamping={true}
          dampingFactor={0.06}
          minDistance={1.15}
          maxDistance={32}
        />

        <SmoothZoom 
          controlsRef={controlsRef} 
          sensitivity={0.0001} 
          decay={0.90} 
          enabled={zoomMode === "Smooth"}
        />
      </Canvas>
    </div>
  );
}