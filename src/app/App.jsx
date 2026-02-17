import {
    useMemo,
    useState,
    useRef,
    useEffect,
    useCallback,
    Suspense,
} from "react";
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

const CAM_CONFIG = { position: [0, 1.2, 1.8], fov: 60, near: 0.01, far: 1000 };
const AUTO_ROTATE_DELAY = 5000;
const AUTO_ROTATE_TARGET = -0.5;
const AUTO_ROTATE_ACCEL = 0.01;

function useIdleRotation(controlsRef) {
    const idleRef = useRef({
        lastActivity: 0,
        accelerating: false,
        raf: null,
        speed: 0,
    });

    useEffect(() => {
        idleRef.current.lastActivity = performance.now();
    }, []);

    const resetIdle = useCallback(() => {
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
    }, [controlsRef]);

    useEffect(() => {
        const events = ["keydown", "mousedown", "wheel", "touchstart"];
        events.forEach((e) =>
            window.addEventListener(e, resetIdle, { passive: true })
        );
        return () =>
            events.forEach((e) => window.removeEventListener(e, resetIdle));
    }, [resetIdle]);

    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls) return;
        controls.addEventListener("start", resetIdle);
        return () => controls.removeEventListener("start", resetIdle);
    }, [resetIdle, controlsRef]);

    useEffect(() => {
        const check = () => {
            const controls = controlsRef.current;
            if (!controls) return;

            const dist = controls.object.position.distanceTo(
                new THREE.Vector3(...CAM_CONFIG.position)
            );
            const targetDist = controls.target.distanceTo(
                new THREE.Vector3(0, 0, 0)
            );
            const isNearSpawn = dist < 0.15 && targetDist < 0.1;

            if (!isNearSpawn) {
                if (idleRef.current.accelerating) resetIdle();
                return;
            }

            if (
                performance.now() - idleRef.current.lastActivity <
                AUTO_ROTATE_DELAY
            )
                return;

            if (!idleRef.current.accelerating) {
                idleRef.current.accelerating = true;
                idleRef.current.speed = 0;
                controls.autoRotate = true;

                const step = () => {
                    if (!idleRef.current.accelerating) return;

                    const delta =
                        idleRef.current.speed < AUTO_ROTATE_TARGET
                            ? AUTO_ROTATE_ACCEL
                            : -AUTO_ROTATE_ACCEL;

                    if (
                        Math.abs(idleRef.current.speed - AUTO_ROTATE_TARGET) <
                        0.01
                    ) {
                        idleRef.current.speed = AUTO_ROTATE_TARGET;
                    } else {
                        idleRef.current.speed +=
                            (AUTO_ROTATE_TARGET < 0 ? -1 : 1) * Math.abs(delta);
                    }

                    if (controlsRef.current)
                        controlsRef.current.autoRotateSpeed =
                            idleRef.current.speed;
                    idleRef.current.raf = requestAnimationFrame(step);
                };
                idleRef.current.raf = requestAnimationFrame(step);
            }
        };

        const interval = setInterval(check, 500);
        return () => clearInterval(interval);
    }, [resetIdle, controlsRef]);
}

function useCameraReset(controlsRef) {
    const animRef = useRef(null);

    const resetCamera = useCallback(() => {
        const controls = controlsRef.current;
        if (!controls) return;

        if (window.__resetZoomVelocity) window.__resetZoomVelocity();
        if (animRef.current) cancelAnimationFrame(animRef.current);

        const startPos = controls.object.position.clone();
        const startTarget = controls.target.clone();
        const endPos = new THREE.Vector3(...CAM_CONFIG.position);
        const endTarget = new THREE.Vector3(0, 0, 0);

        const startTime = performance.now();
        const duration = 800;

        function tick(now) {
            const elapsed = Math.min(1, (now - startTime) / duration);
            const eased =
                elapsed < 0.5
                    ? 4 * elapsed * elapsed * elapsed
                    : 1 - Math.pow(-2 * elapsed + 2, 3) / 2;

            controls.object.position.lerpVectors(startPos, endPos, eased);
            controls.target.lerpVectors(startTarget, endTarget, eased);
            controls.update();

            if (elapsed < 1) {
                animRef.current = requestAnimationFrame(tick);
            } else {
                animRef.current = null;
            }
        }
        animRef.current = requestAnimationFrame(tick);
    }, [controlsRef]);

    useEffect(
        () => () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        },
        []
    );

    return resetCamera;
}

function useSimulationWorker(onEvents) {
    const workerRef = useRef(null);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        return () => {
            if (workerRef.current) workerRef.current.terminate();
        };
    }, []);

    const run = useCallback(
        (actor, target) => {
            setIsRunning(true);

            if (!workerRef.current) {
                workerRef.current = new Worker(
                    new URL("../workers/simulatorWorker.js", import.meta.url),
                    { type: "module" }
                );

                workerRef.current.onmessage = (e) => {
                    if (!e.data?.error) {
                        onEvents(e.data.events || []);
                    } else {
                        console.error("Simulation worker error:", e.data.error);
                    }
                    setIsRunning(false);
                };

                workerRef.current.onerror = (err) => {
                    console.error("Worker failed:", err);
                    setIsRunning(false);
                };
            }

            workerRef.current.postMessage({ actor, target });
        },
        [onEvents]
    );

    return { run, isRunning };
}

export default function App() {
    const [events, setEvents] = useState(null);
    const [tickStep, setTickStep] = useState(settings.tickStep);
    const [isPaused, setIsPaused] = useState(false);
    const [showGeo, setShowGeo] = useState(false);
    const [uiHidden, setUiHidden] = useState(false);

    const [perfSettings, setPerfSettings] = useState(() => ({
        antialias: settings.antialias,
        pixelRatioLimit: settings.pixelRatioLimit,
        powerPreference: settings.powerPreference,
        preserveDrawingBuffer: settings.preserveDrawingBuffer,
    }));
    const [earthTexture, setEarthTexture] = useState(
        settings.texture || TEXTURES[0]
    );
    const [soundEnabled, setSoundEnabled] = useState(
        Boolean(settings.audioEnabled)
    );
    const [postEffectsEnabled, setPostEffectsEnabled] = useState(
        settings.postEffectsEnabled ?? true
    );

    const controlsRef = useRef();

    useEffect(() => {
        const id = setTimeout(() => setShowGeo(true), 300);
        return () => clearTimeout(id);
    }, []);

    useIdleRotation(controlsRef);
    const resetCamera = useCameraReset(controlsRef);
    const { run, isRunning } = useSimulationWorker(setEvents);

    const { visible, currentTick } = useEventTimeline(
        events,
        1000,
        1,
        isPaused,
        tickStep
    );

    const displayTick = currentTick;

    const affectedIsos = useMemo(() => {
        if (!visible.length) return [];
        const isoSet = new Set();
        for (let i = 0; i < visible.length; i++) {
            const e = visible[i];
            if (e.from) isoSet.add(e.from.toUpperCase());
            if (e.to) isoSet.add(e.to.toUpperCase());
            if (e.attacker) isoSet.add(e.attacker.toUpperCase());
            if (e.target) isoSet.add(e.target.toUpperCase());
        }
        return Array.from(isoSet);
    }, [visible]);

    const logDisplay = useMemo(() => {
        if (uiHidden || !visible.length) return "SYSTEM READY";

        const recent = visible.slice(-50).reverse();
        return JSON.stringify(
            recent.map((e) => {
                const {
                    fromLat: _fl,
                    fromLon: _flo,
                    toLat: _tl,
                    toLon: _tlo,
                    id: _id,
                    intensity: _in,
                    ...rest
                } = e;
                return rest;
            }),
            null,
            2
        );
    }, [visible, uiHidden]);

    const glConfig = useMemo(
        () => ({
            antialias: perfSettings.antialias,
            powerPreference: perfSettings.powerPreference,
            preserveDrawingBuffer: perfSettings.preserveDrawingBuffer,
            logarithmicDepthBuffer: false,
            alpha: false,
            stencil: false,
            depth: true,
        }),
        [perfSettings]
    );

    const toggleUI = () => setUiHidden((p) => !p);
    const togglePause = () => setIsPaused((p) => !p);

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
                        performanceSettings={perfSettings}
                        onPerformanceChange={setPerfSettings}
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
                <button className="hide-ui-button" onClick={toggleUI}>
                    {uiHidden ? "Show UI" : "Hide UI"}
                </button>
                {!uiHidden && (
                    <>
                        <button className="pause-button" onClick={togglePause}>
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

            {!uiHidden && logDisplay && (
                <pre className="event-log">{logDisplay}</pre>
            )}

            <Canvas
                key={JSON.stringify(perfSettings)}
                className="canvas-3d"
                dpr={[1, perfSettings.pixelRatioLimit]}
                gl={glConfig}
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
                    />

                    <PostEffects
                        enabled={postEffectsEnabled}
                        multisampling={perfSettings.antialias ? 4 : 0}
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
