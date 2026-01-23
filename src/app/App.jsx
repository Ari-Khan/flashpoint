import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import Globe from "../components/Globe";
import CountryBorders from "../components/CountryBorders";
import ControlPanel from "../components/ControlPanel";
import CountryFillManager from "../components/CountryFillManager";
import Skybox from "../components/Skybox";
import Atmosphere from "../components/Atmosphere";
import ExplosionManager from "../components/ExplosionManager";
import ArcManager from "../components/ArcManager"; 
import SettingsPanel from "../components/SettingsPanel";

import { useEventTimeline } from "../hooks/useEventTimeline";
import { loadWorld } from "../data/loadData";
import { simulateEscalation } from "../sim/simulateEscalation";

import "../index.css";

const world = loadWorld();
const BASE_TICK_MS = 1000;

export default function App() {
    const [events, setEvents] = useState(null);
    const [tickStep, setTickStep] = useState(1);
    const [smoothMode, setSmoothMode] = useState("off");
    const [displayTick, setDisplayTick] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const lastTickTimeRef = useRef(performance.now());

    const timePerStep = BASE_TICK_MS * tickStep;

    const { visible, currentTick } = useEventTimeline(events, timePerStep, tickStep, isPaused);

    function run(actor, target) {
        const rawTimeline = simulateEscalation({
            initiator: actor,
            firstTarget: target,
            world,
        });

        setEvents(rawTimeline);
    }

    useEffect(() => {
        lastTickTimeRef.current = performance.now();
    }, [currentTick]);

    useEffect(() => {
        if (smoothMode === "off") {
            setDisplayTick(currentTick);
            return undefined;
        }

        const frameMs = 1000 / 32;
        let rafId;

        const tick = () => {
            const elapsed = performance.now() - lastTickTimeRef.current;
            const factor = Math.min(1, elapsed / timePerStep);
            setDisplayTick(currentTick + factor * tickStep);
            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(rafId);
    }, [smoothMode, currentTick, tickStep, timePerStep]);

    const affectedIso2 = useMemo(() => {
        if (!visible.length) return [];

        return [
            ...new Set(
                visible
                    .filter((e) => e.type === "launch")
                    .flatMap((e) => [
                        world.nations[e.from]?.iso2,
                        world.nations[e.to]?.iso2,
                    ])
                    .filter(Boolean),
            ),
        ];
    }, [visible]);

    return (
        <div className="app-container">
            <ControlPanel nations={world.nations} onRun={run} />
            <SettingsPanel
                tickStep={tickStep}
                onTickStepChange={setTickStep}
                smoothMode={smoothMode}
                onSmoothModeChange={setSmoothMode}
            />

            {events && (
                <div className="time-controls">
                    <button
                        className="pause-button"
                        onClick={() => setIsPaused(!isPaused)}
                    >
                        {isPaused ? "Resume" : "Pause"}
                    </button>
                    <div className="time-display">T+{Math.floor(displayTick)}</div>
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
                <CountryBorders />
                <Globe />
                <Atmosphere />

                <CountryFillManager
                    activeIso2={affectedIso2}
                    nations={world.nations}
                />

                <OrbitControls
                    enableZoom
                    enablePan
                    enableRotate
                    enableDamping
                    touches={{
                        ONE: 2,
                        TWO: 1,
                    }}
                    minDistance={1.3}
                    maxDistance={8}
                />
            </Canvas>
        </div>
    );
}
