import { useState, useEffect, useRef, useMemo } from "react";
import Tooltip from "./Tooltip.jsx";

function useFPS() {
    const [fps, setFps] = useState(0);
    const frames = useRef(0);
    const lastFpsUpdate = useRef(performance.now());

    useEffect(() => {
        let frameId;
        const loop = () => {
            frames.current++;
            const now = performance.now();
            const elapsed = now - lastFpsUpdate.current;

            if (elapsed >= 500) {
                setFps(Math.round((frames.current * 1000) / elapsed));
                frames.current = 0;
                lastFpsUpdate.current = now;
            }
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, []);
    return fps;
}

const TICK_OPTIONS = [
    { label: "1 tick/sec", value: 1 },
    { label: "2 ticks/sec", value: 0.5 },
    { label: "4 ticks/sec", value: 0.25 },
    { label: "8 ticks/sec", value: 0.125 },
    { label: "16 ticks/sec", value: 0.0625 },
    { label: "Smooth", value: 0.03125 },
];

export default function SettingsPanel({
    tickStep,
    onTickStepChange,
    performanceSettings = {},
    onPerformanceChange = () => { },
    texture,
    onTextureChange = () => { },
}) {
    const fps = useFPS();
    const [open, setOpen] = useState(false);
    const [tip, setTip] = useState({ text: null, x: 0, y: 0 });

    const padIfLong = (s) => s + (s.length >= 10 ? "\u00A0\u00A0" : "");

    const textureOptions = useMemo(() => {
        const files = ["specular.avif", "topography.avif", "terrain.avif", "bathymetry.avif", "physical.avif", "night.avif"];
        return files.map(file => {
            const name = file.split('.')[0];
            return {
                label: name.charAt(0).toUpperCase() + name.slice(1),
                value: file
            };
        });
    }, []);

    const handleMouse = (e, text = null) => {
        if (!text) return setTip({ text: null, x: 0, y: 0 });
        const r = e.currentTarget.getBoundingClientRect();
        setTip({ text, x: Math.max(8, r.left), y: Math.max(8, r.top - 44) });
    };

    return (
        <>
            <div className="fps-box">
                <span className="fps-label">FPS:</span>
                <span className="fps-value">{fps}</span>
            </div>

            <div className="settings-panel">
                <button
                    className="settings-toggle"
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                >
                    {open ? "Close Settings" : "Settings"}
                </button>

                {open && (
                    <div className="settings-body dropup">
                        <SettingRow label="Tick" tip="How frequently the simulation advances (or Smooth for interpolation)." onMouse={handleMouse}>
                            <select
                                value={tickStep}
                                onChange={(e) => onTickStepChange(Number(e.target.value))}
                            >
                                {TICK_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{padIfLong(opt.label)}</option>
                                ))}
                            </select>
                        </SettingRow>

                        <SettingRow label="AA" tip="Smooths edges with multi-sample AA; uses more GPU." onMouse={handleMouse}>
                            <select
                                value={performanceSettings.antialias ? "on" : "off"}
                                onChange={(e) => onPerformanceChange({ ...performanceSettings, antialias: e.target.value === "on" })}
                            >
                                <option value="on">On</option>
                                <option value="off">Off</option>
                            </select>
                        </SettingRow>

                        <SettingRow label="DPR Cap" tip="Caps rendering DPR to reduce GPU workload." onMouse={handleMouse}>
                            <select
                                value={performanceSettings.pixelRatioLimit ?? 2}
                                onChange={(e) => onPerformanceChange({ ...performanceSettings, pixelRatioLimit: Number(e.target.value) })}
                            >
                                <option value={1}>1</option>
                                <option value={1.5}>1.5</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                            </select>
                        </SettingRow>

                        <SettingRow label="Power" tip="Browser hint to prefer discrete GPU when available." onMouse={handleMouse}>
                            <select
                                value={performanceSettings.powerPreference ?? "default"}
                                onChange={(e) => onPerformanceChange({ ...performanceSettings, powerPreference: e.target.value })}
                            >
                                <option value="default">Default</option>
                                <option value="high-performance">{padIfLong("High Performance")}</option>
                                <option value="low-power">Low Power</option>
                            </select>
                        </SettingRow>

                        <SettingRow label="Buffer" tip="Retains framebuffer after draw; useful for screenshots." onMouse={handleMouse}>
                            <select
                                value={performanceSettings.preserveDrawingBuffer ? "on" : "off"}
                                onChange={(e) => onPerformanceChange({ ...performanceSettings, preserveDrawingBuffer: e.target.value === "on" })}
                            >
                                <option value="off">Off</option>
                                <option value="on">On</option>
                            </select>
                        </SettingRow>

                        <SettingRow label="Texture" tip="Choose a different Earth texture (night, terrain, etc.)" onMouse={handleMouse}>
                            <select
                                value={texture}
                                onChange={(e) => onTextureChange(e.target.value)}
                            >
                                {textureOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{padIfLong(opt.label)}</option>
                                ))}
                            </select>
                        </SettingRow>
                    </div>
                )}
                <Tooltip text={tip.text} x={tip.x} y={tip.y} />
            </div>
        </>
    );
}

function SettingRow({ label, tip, onMouse, children }) {
    return (
        <label className="settings-row">
            <span
                onMouseEnter={(e) => onMouse(e, tip)}
                onMouseLeave={(e) => onMouse(e)}
            >
                {label}
            </span>
            <div className="control">{children}</div>
        </label>
    );
}