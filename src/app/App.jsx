import { useMemo, useState, useRef, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

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
import { loadWorld } from "../utils/loadData.js";
import { simulateEscalation } from "../sim/simulator.js";

import "../index.css";
import settings from "../config/settings.json";

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

const CAM_CONFIG = {
    position: [0, 1.2, 1.8],
    fov: 60,
    near: 0.01,
    far: 1000,
};

export default function App() {
    const [events, setEvents] = useState(null);
    const [tickStep, setTickStep] = useState(settings.tickStep);
    const [smoothMode, setSmoothMode] = useState("off");
    const [isPaused, setIsPaused] = useState(false);
    const [showGeo, setShowGeo] = useState(false);
    const [uiHidden, setUiHidden] = useState(false);
    const controlsRef = useRef();
    const resetAnimRef = useRef(null);

    useEffect(() => {
        const id = setTimeout(() => setShowGeo(true), 300);
        return () => clearTimeout(id);
    }, []);

    const timePerStep = BASE_TICK_MS * tickStep;

    const [performanceSettings, setPerformanceSettings] = useState(() => ({
        antialias: settings.antialias,
        pixelRatioLimit: settings.pixelRatioLimit,
        powerPreference: settings.powerPreference,
        preserveDrawingBuffer: settings.preserveDrawingBuffer,
    }));

    const [earthTexture, setEarthTexture] = useState(
        settings.texture || TEXTURES[0]
    );

    const { visible, currentTick } = useEventTimeline(
        events,
        timePerStep,
        tickStep,
        isPaused
    );
    const displayTick = useSimulationClock(
        currentTick,
        tickStep,
        timePerStep,
        smoothMode
    );

    const affectedIsos = useMemo(() => {
        const isoSet = new Set();
        for (let i = 0; i < visible.length; i++) {
            const e = visible[i];
            const ids = [e.from, e.to, e.attacker, e.target];
            for (let j = 0; j < ids.length; j++) {
                if (ids[j]) isoSet.add(ids[j].toUpperCase());
            }
        }
        return Array.from(isoSet);
    }, [visible]);

    const visibleForLog = useMemo(() => {
        return visible
            .slice()
            .reverse()
            .map((e) => {
                const { fromLat, fromLon, toLat, toLon, ...logFriendly } = e;
                return logFriendly;
            });
    }, [visible]);

    function run(actor, target) {
        setEvents(
            simulateEscalation({
                initiator: actor,
                firstTarget: target,
                world,
            })
        );
    }

    function resetCamera() {
        const controls = controlsRef.current;
        if (!controls) return;
        if (window.__resetZoomVelocity) window.__resetZoomVelocity();

        if (resetAnimRef.current) {
            cancelAnimationFrame(resetAnimRef.current);
            resetAnimRef.current = null;
        }

        const startPos = controls.object.position.clone();
        const startTarget = controls.target.clone();
        const endPos = new THREE.Vector3(...CAM_CONFIG.position);
        const endTarget = new THREE.Vector3(0, 0, 0);
        const duration = 800; // ms
        const startTime = performance.now();

        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function tick(now) {
            const elapsed = Math.min(1, (now - startTime) / duration);
            const eased = easeInOutCubic(elapsed);

            controls.object.position.lerpVectors(startPos, endPos, eased);
            controls.target.lerpVectors(startTarget, endTarget, eased);
            controls.update();

            if (elapsed < 1) {
                resetAnimRef.current = requestAnimationFrame(tick);
            } else {
                controls.object.position.set(...CAM_CONFIG.position);
                controls.target.set(0, 0, 0);
                controls.update();
                resetAnimRef.current = null;
            }
        }

        resetAnimRef.current = requestAnimationFrame(tick);
    }

    useEffect(() => {
        return () => {
            if (resetAnimRef.current) cancelAnimationFrame(resetAnimRef.current);
        };
    }, []);

    return (
        <div className="app-container">
            {!uiHidden && (
                <>
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
                    />
                </>
            )}

            <div className="time-controls">
                <div className="time-display">T+{Math.floor(displayTick)}</div>
                <button
                    className="hide-ui-button"
                    onClick={() => setUiHidden((v) => !v)}
                >
                    {uiHidden ? "Show UI" : "Hide UI"}
                </button>
                {!uiHidden && (
                    <>
                        <button
                            className="pause-button"
                            onClick={() => setIsPaused(!isPaused)}
                        >
                            {isPaused ? "Resume" : "Pause"}
                        </button>
                        <button
                            className="pause-button reset-button"
                            onClick={resetCamera}
                        >
                            Reset Cam
                        </button>
                    </>
                )}
            </div>

            {!uiHidden && (
                <pre className="event-log">
                    {visible.length
                        ? JSON.stringify(visibleForLog, null, 2)
                        : "SYSTEM READY"}
                </pre>
            )}

            <Canvas
                key={`${performanceSettings.antialias}-${performanceSettings.pixelRatioLimit}`}
                className="canvas-3d"
                dpr={[1, performanceSettings.pixelRatioLimit]}
                gl={{
                    antialias: performanceSettings.antialias,
                    powerPreference: performanceSettings.powerPreference,
                    preserveDrawingBuffer:
                        performanceSettings.preserveDrawingBuffer,
                    logarithmicDepthBuffer: true,
                }}
                camera={CAM_CONFIG}
            >
                <Skybox />
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1.0} />

                <Suspense fallback={null}>
                    <ArcManager
                        events={visible}
                        nations={world.nations}
                        currentTime={displayTick}
                    />
                    <ExplosionManager
                        events={visible}
                        nations={world.nations}
                        currentTime={displayTick}
                    />
                    {showGeo && (
                        <>
                            <CountryBorders />
                            <Cities nations={world.nations} />
                            <CountryFillManager
                                activeIsos={affectedIsos}
                                nations={world.nations}
                            />
                        </>
                    )}
                </Suspense>

                <Globe textureName={earthTexture} />
                <Atmosphere />

                <OrbitControls
                    ref={controlsRef}
                    enableZoom={false}
                    enableDamping={true}
                    dampingFactor={0.04}
                    minDistance={1.125}
                    maxDistance={32}
                />

                <SmoothZoom
                    controlsRef={controlsRef}
                    sensitivity={0.0001}
                    decay={0.925}
                    minDistance={1.125}
                    maxDistance={32}
                    enabled={true}
                />
            </Canvas>
        </div>
    );
}
