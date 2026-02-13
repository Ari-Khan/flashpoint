import { useMemo, useState, useRef, useEffect, useLayoutEffect, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import Globe from "../components/Globe.jsx";
import CountryBorders from "../components/CountryBorders.jsx";
import ControlPanel from "../components/ControlPanel.jsx";
import CountryFill from "../components/CountryFill.jsx";
import Skybox from "../components/Skybox.jsx";
import Atmosphere from "../components/Atmosphere.jsx";
import ExplosionManager from "../components/Explosion.jsx";
import ArcManager from "../components/Arc.jsx";
import Cities from "../components/Cities.jsx";
import SettingsPanel from "../components/SettingsPanel.jsx";
import SmoothZoom from "../components/SmoothZoom.jsx";
import Audio from "../components/Audio.jsx";
import PostEffects from "../components/PostEffects.jsx";

import { useEventTimeline } from "../hooks/useEventTimeline.js";
import { useSimulationClock } from "../hooks/useSimulationClock.js";
import { loadWorld } from "../utils/loadData.js";

import "../index.css";
import settings from "../config/settings.json";

const world = loadWorld();

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

const AUTO_ROTATE_DELAY = 5000;
const AUTO_ROTATE_TARGET = -0.5;
const AUTO_ROTATE_ACCEL = 0.01;

export default function App() {
    const [events, setEvents] = useState(null);
    const [tickStep, setTickStep] = useState(settings.tickStep);
    const [isPaused, setIsPaused] = useState(false);
    const [showGeo, setShowGeo] = useState(false);
    const [uiHidden, setUiHidden] = useState(false);
    const controlsRef = useRef();
    const resetAnimRef = useRef(null);

    const idleRef = useRef({
        lastActivity: 0,
        accelerating: false,
        raf: null,
        speed: 0,
    });

    useLayoutEffect(() => {
        idleRef.current.lastActivity = performance.now();
    }, []);

    const resetIdleActivity = useCallback(() => {
        idleRef.current.lastActivity = performance.now();
        if (controlsRef.current) {
            controlsRef.current.autoRotate = false;
            controlsRef.current.autoRotateSpeed = 0;
        }
        if (idleRef.current.raf) {
            cancelAnimationFrame(idleRef.current.raf);
            idleRef.current.raf = null;
        }
        idleRef.current.accelerating = false;
        idleRef.current.speed = 0;
    }, []);

    useEffect(() => {
        const onActivity = () => resetIdleActivity();
        window.addEventListener("keydown", onActivity);
        window.addEventListener("mousedown", onActivity);
        window.addEventListener("wheel", onActivity, { passive: true });
        window.addEventListener("touchstart", onActivity, { passive: true });

        return () => {
            window.removeEventListener("keydown", onActivity);
            window.removeEventListener("mousedown", onActivity);
            window.removeEventListener("wheel", onActivity);
            window.removeEventListener("touchstart", onActivity);
        };
    }, [resetIdleActivity]);

    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls) return;
        const onStart = () => resetIdleActivity();
        controls.addEventListener("start", onStart);
        return () => {
            controls.removeEventListener("start", onStart);
        };
    }, [resetIdleActivity]);

    useEffect(() => {
        const check = () => {
            const controls = controlsRef.current;
            if (!controls) return;

            const camPos = controls.object.position;
            const defaultPos = new THREE.Vector3(...CAM_CONFIG.position);
            const dist = camPos.distanceTo(defaultPos);
            const targetDist = controls.target.distanceTo(
                new THREE.Vector3(0, 0, 0)
            );

            const isNearSpawn = dist < 0.15 && targetDist < 0.1;

            if (!isNearSpawn) {
                if (idleRef.current.accelerating) {
                    resetIdleActivity();
                }
                return;
            }

            const now = performance.now();
            if (now - idleRef.current.lastActivity < AUTO_ROTATE_DELAY) return;

            if (!idleRef.current.accelerating) {
                idleRef.current.accelerating = true;
                idleRef.current.speed = 0;
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0;

                function step() {
                    if (!idleRef.current.accelerating) return;
                    if (AUTO_ROTATE_TARGET < 0) {
                        idleRef.current.speed = Math.max(
                            AUTO_ROTATE_TARGET,
                            idleRef.current.speed - AUTO_ROTATE_ACCEL
                        );
                    } else {
                        idleRef.current.speed = Math.min(
                            AUTO_ROTATE_TARGET,
                            idleRef.current.speed + AUTO_ROTATE_ACCEL
                        );
                    }
                    if (controls)
                        controls.autoRotateSpeed = idleRef.current.speed;
                    idleRef.current.raf = requestAnimationFrame(step);
                }

                idleRef.current.raf = requestAnimationFrame(step);
            }
        };

        const interval = setInterval(check, 500);
        return () => clearInterval(interval);
    }, [resetIdleActivity]);

    const workerRef = useRef(null);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => setShowGeo(true), 300);
        return () => clearTimeout(id);
    }, []);

    const ticksPerSecond = 1;
    const timePerUpdate = 1000 * tickStep;
    const simulationTicksPerUpdate = ticksPerSecond * tickStep;

    const [performanceSettings, setPerformanceSettings] = useState(() => ({
        antialias: settings.antialias,
        pixelRatioLimit: settings.pixelRatioLimit,
        powerPreference: settings.powerPreference,
        preserveDrawingBuffer: settings.preserveDrawingBuffer,
    }));

    const [earthTexture, setEarthTexture] = useState(
        settings.texture || TEXTURES[0]
    );

    const [soundEnabled, setSoundEnabled] = useState(Boolean(settings.audioEnabled));

    const [postEffectsEnabled, setPostEffectsEnabled] = useState(
        settings.postEffectsEnabled === undefined
            ? true
            : Boolean(settings.postEffectsEnabled)
    );

    const { visible, currentTick } = useEventTimeline(
        events,
        timePerUpdate,
        simulationTicksPerUpdate,
        isPaused
    );
    const interpolatedTick = useSimulationClock(
        currentTick,
        simulationTicksPerUpdate,
        timePerUpdate,
        isPaused
    );

    const isContinuous = tickStep <= 0.0625;
    const displayTick = isContinuous ? interpolatedTick : currentTick;

    const postDataRef = useRef({ events: [], currentTime: 0 });
    useEffect(() => {
        postDataRef.current = { events: visible, currentTime: displayTick };
    }, [visible, displayTick]);

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
        const nameFor = (code) =>
            typeof code === "string"
                ? world.nations?.[code]?.name || code
                : code;

        return visible
            .slice()
            .reverse()
            .map((e) => {
                const {
                    fromLat: _fromLat,
                    fromLon: _fromLon,
                    toLat: _toLat,
                    toLon: _toLon,
                    ...logFriendly
                } = e;

                if (e.type === "launch" && "id" in logFriendly) {
                    delete logFriendly.id;
                }

                if (
                    (e.type === "ally-join" || e.type === "faction-join") &&
                    "intensity" in logFriendly
                ) {
                    delete logFriendly.intensity;
                }

                const codeFields = [
                    "from",
                    "to",
                    "attacker",
                    "target",
                    "country",
                    "reason",
                ];
                for (const f of codeFields) {
                    if (logFriendly[f] && typeof logFriendly[f] === "string") {
                        logFriendly[f] = nameFor(logFriendly[f]);
                    }
                }

                return logFriendly;
            });
    }, [visible]);

    function run(actor, target) {
        setIsRunning(true);

        if (!workerRef.current) {
            workerRef.current = new Worker(
                new URL("../workers/simulatorWorker.js", import.meta.url),
                { type: "module" }
            );

            workerRef.current.onmessage = (e) => {
                if (e.data?.error) {
                    console.error("Simulation worker error:", e.data.error);
                    setIsRunning(false);
                    return;
                }
                setEvents(e.data.events || []);
                setIsRunning(false);
            };

            workerRef.current.onerror = (err) => {
                console.error("Worker failed:", err);
                setIsRunning(false);
            };
        }

        workerRef.current.postMessage({ actor, target });
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
        const duration = 800;
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
            if (resetAnimRef.current)
                cancelAnimationFrame(resetAnimRef.current);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);

    return (
        <div className="app-container">
            {!uiHidden && (
                <>
                    <ControlPanel
                        nations={world.nations}
                        onRun={run}
                        isRunning={isRunning}
                    />
                    <SettingsPanel
                        tickStep={tickStep}
                        onTickStepChange={setTickStep}
                        performanceSettings={performanceSettings}
                        onPerformanceChange={setPerformanceSettings}
                        texture={earthTexture}
                        onTextureChange={setEarthTexture}
                        soundEnabled={soundEnabled}
                        onSoundChange={setSoundEnabled}
                        postEffectsEnabled={postEffectsEnabled}
                        onPostEffectsChange={setPostEffectsEnabled}
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
                <Skybox postEffectsEnabled={postEffectsEnabled} />
                <Audio enabled={soundEnabled} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1.0} />

                <Suspense fallback={null}>
                    <ArcManager
                        events={visible}
                        nations={world.nations}
                        displayTime={displayTick}
                        simTime={currentTick}
                    />
                    <ExplosionManager
                        events={visible}
                        nations={world.nations}
                        displayTime={displayTick}
                        simTime={currentTick}
                    />

                    <PostEffects
                        dataRef={postDataRef}
                        meanIntervalSeconds={20}
                        enabled={postEffectsEnabled}
                        multisampling={performanceSettings.antialias ? 4 : 0}
                    />
                    {showGeo && (
                        <>
                            <CountryBorders />
                            <Cities nations={world.nations} />
                            <CountryFill
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
