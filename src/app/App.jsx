import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef } from "react";

import Globe from "../components/Globe";
import CountryBorders from "../components/CountryBorders";
import ControlPanel from "../components/ControlPanel";
import CountryFillManager from "../components/CountryFillManager";
import Skybox from "../components/Skybox";
import Atmosphere from "../components/Atmosphere";
import ExplosionManager from "../components/ExplosionManager";
import ArcManager from "../components/ArcManager"; 
import Cities from "../components/Cities";
import SettingsPanel from "../components/SettingsPanel";
import SmoothZoom from "../components/SmoothZoom";

import { useEventTimeline } from "../hooks/useEventTimeline";
import { useSimulationClock } from "../hooks/useSimulationClock";
import { loadWorld } from "../data/loadData";
import { simulateEscalation } from "../sim/simulateEscalation";

import "../index.css";
import perfCfg from "../config/settings";

const world = loadWorld();
const BASE_TICK_MS = 1000;

const TEXTURES = [
  "specular.png",
  "topography.jpg",
  "terrain.jpg",
  "bathymetry.jpg",
  "physical.jpg",
  "night.jpg",
];

export default function App() {
  const [events, setEvents] = useState(null);
  const [tickStep, setTickStep] = useState(perfCfg?.tickStep ?? 1);
  const [smoothMode, setSmoothMode] = useState("off");
  const [isPaused, setIsPaused] = useState(false);
  const controlsRef = useRef();
  const [zoomMode, setZoomMode] = useState("Smooth");

  const timePerStep = BASE_TICK_MS * tickStep;

  const [performanceSettings, setPerformanceSettings] = useState(() => {
    const cfg = perfCfg ?? {};
    return {
      antialias: cfg.antialias ?? true,
      pixelRatioLimit: cfg.pixelRatioLimit ?? 2,
      powerPreference: cfg.powerPreference ?? "high-performance",
      preserveDrawingBuffer: cfg.preserveDrawingBuffer ?? false,
    };
  });

  const [earthTexture, setEarthTexture] = useState(TEXTURES[0] ?? "specular.png");

  const { visible, currentTick } = useEventTimeline(events, timePerStep, tickStep, isPaused);
  
  const displayTick = useSimulationClock(currentTick, tickStep, timePerStep, smoothMode);

  const affectedIso2 = useMemo(() => {
    if (!visible.length) return [];
    const isoSet = new Set();
    visible.forEach(e => {
      if (e.type === "launch") {
        const fromIso = world.nations[e.from]?.iso2;
        const toIso = world.nations[e.to]?.iso2;
        if (fromIso) isoSet.add(fromIso);
        if (toIso) isoSet.add(toIso);
      }
    });
    return Array.from(isoSet);
  }, [visible]);

  const visibleForLog = useMemo(() => {
    return (visible ?? []).map(e => {
      const copy = { ...e };
      delete copy.fromLat; delete copy.fromLon; delete copy.toLat; delete copy.toLon;
      return copy;
    });
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
        {visible.length ? JSON.stringify([...visibleForLog].reverse(), null, 2) : "No events yet"}
      </pre>

      <Canvas
        key={JSON.stringify(performanceSettings)}
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
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} />

        <ArcManager events={visible} nations={world.nations} currentTime={displayTick} />
        <ExplosionManager events={visible} nations={world.nations} currentTime={displayTick} />

        <CountryBorders />
        <Globe textureName={earthTexture} />
        <Cities nations={world.nations} />
        <Atmosphere />

        <CountryFillManager activeIso2={affectedIso2} nations={world.nations} />

        <OrbitControls 
            ref={controlsRef} 
            enableZoom={zoomMode === "Block"}
            enableDamping={true}
            dampingFactor={0.06}
            minDistance={1.2}
            maxDistance={8}
        />

        <SmoothZoom 
            controlsRef={controlsRef} 
            sensitivity={0.0001} 
            decay={0.90} 
            minDistance={1.2} 
            maxDistance={8} 
            enabled={zoomMode === "Smooth"}
        />
      </Canvas>
    </div>
  );
}