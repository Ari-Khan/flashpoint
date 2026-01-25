import { useState, useEffect, useRef } from "react";

function useFPS() {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const lastFpsUpdate = useRef(0);

  useEffect(() => {
    let running = true;
    lastFpsUpdate.current = performance.now();
    function loop() {
      if (!running) return;
      frames.current++;
      const now = performance.now();
      if (now - lastFpsUpdate.current > 500) {
        setFps(Math.round((frames.current * 1000) / (now - lastFpsUpdate.current)));
        frames.current = 0;
        lastFpsUpdate.current = now;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    return () => { running = false; };
  }, []);
  return fps;
}

import perfCfg from "../config/settings.js";

const OPTIONS = perfCfg.tickOptions || [
  { label: "1 tick/sec", value: 1 },
  { label: "2 ticks/sec", value: 0.5 },
  { label: "4 ticks/sec", value: 0.25 },
  { label: "8 ticks/sec", value: 0.125 },
  { label: "16 ticks/sec", value: 0.0625 },
  { label: "Smooth", value: 0.03125 },
];

const TEXTURE_OPTIONS = perfCfg.textureOptions || [
  { label: "Specular", value: "specular.avif" },
  { label: "Topography", value: "topography.avif" },
  { label: "Terrain", value: "terrain.avif" },
  { label: "Bathymetry", value: "bathymetry.avif" },
  { label: "Physical", value: "physical.avif" },
  { label: "Night", value: "night.avif" },
];

import Tooltip from "./Tooltip.jsx";

export default function SettingsPanel({
  tickStep,
  onTickStepChange,
  performanceSettings = {},
  onPerformanceChange = () => {},
  texture,
  onTextureChange = () => {},
}) {
  const fps = useFPS();
  const fpsBoxStyle = null;
  const [open, setOpen] = useState(false);
  const [tipText, setTipText] = useState(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });
  const padIfLong = (s) => s + (s.length >= 10 ? "\u00A0\u00A0" : "");

  function showTipFor(el) {
    if (!el) return;
    const txt = el.getAttribute("data-tip");
    if (!txt) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(8, r.left);
    const y = Math.max(8, r.top - 44);
    setTipText(txt);
    setTipPos({ x, y });
  }
  function hideTip() {
    setTipText(null);
  }

  return (
    <>
      <div className="fps-box"><span className="fps-label">FPS:</span><span className="fps-value">{fps}</span></div>
      <div className="settings-panel">
      <button
        className="settings-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Close Settings" : "Settings"}
      </button>

      {open && (
        <div className="settings-body dropup">
          <label className="settings-row">
            <span data-tip="How frequently the simulation advances (or Smooth for interpolation)." onMouseEnter={(e) => showTipFor(e.currentTarget)} onMouseLeave={hideTip}>Tick</span>
            <div className="control">
              <select
                title="Choose tick rate or Smooth for animated interpolation"
                value={tickStep}
                onChange={(e) => {
                  onTickStepChange(Number(e.target.value));
                }}
              >
                {OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {padIfLong(opt.label)}
                  </option>
                ))}
              </select>
            </div>
          </label>

              <label className="settings-row">
                <span data-tip="Smooths edges with multi-sample AA; uses more GPU." onMouseEnter={(e) => showTipFor(e.currentTarget)} onMouseLeave={hideTip}>AA</span>
                <div className="control">
                  <select
                    title="Enable GPU antialiasing (smoother edges; higher GPU cost)"
                    value={performanceSettings.antialias ? "on" : "off"}
                    onChange={(e) =>
                      onPerformanceChange({
                        ...performanceSettings,
                        antialias: e.target.value === "on",
                      })
                    }
                  >
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </label>

              <label className="settings-row">
                <span data-tip="Caps rendering DPR to reduce GPU workload." onMouseEnter={(e) => showTipFor(e.currentTarget)} onMouseLeave={hideTip}>DPR Cap</span>
                <div className="control">
                  <select
                    title="Maximum device pixel ratio to render at (limits HiDPI cost)"
                    value={performanceSettings.pixelRatioLimit ?? 2}
                    onChange={(e) =>
                      onPerformanceChange({
                        ...performanceSettings,
                        pixelRatioLimit: Number(e.target.value),
                      })
                    }
                  >
                    <option value={1}>1</option>
                    <option value={1.5}>1.5</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
              </label>

              <label className="settings-row">
                <span data-tip="Browser hint to prefer discrete GPU when available." onMouseEnter={(e) => showTipFor(e.currentTarget)} onMouseLeave={hideTip}>Power</span>
                <div className="control">
                  <select
                    title="Renderer hint: prefer discrete GPU (high-performance) or integrated (low-power)"
                    value={performanceSettings.powerPreference ?? "default"}
                    onChange={(e) =>
                      onPerformanceChange({
                        ...performanceSettings,
                        powerPreference: e.target.value,
                      })
                    }
                  >
                    <option value="default">Default</option>
                    <option value="high-performance">{padIfLong("High Performance")}</option>
                    <option value="low-power">Low Power</option>
                  </select>
                </div>
              </label> 

              <label className="settings-row">
                <span data-tip="Retains framebuffer after draw; useful for screenshots." onMouseEnter={(e) => showTipFor(e.currentTarget)} onMouseLeave={hideTip}>Buffer</span>
                <div className="control">
                  <select
                    title="Keep the drawing buffer after render (needed for screenshots; may reduce performance)"
                    value={performanceSettings.preserveDrawingBuffer ? "on" : "off"}
                    onChange={(e) =>
                      onPerformanceChange({
                        ...performanceSettings,
                        preserveDrawingBuffer: e.target.value === "on",
                      })
                    }
                  >
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </div>
              </label>


              <label className="settings-row">
                <span data-tip="Choose a different Earth texture (night, terrain, etc.)" onMouseEnter={(e) => showTipFor(e.currentTarget)} onMouseLeave={hideTip}>Texture</span>
                <div className="control">
                  <select
                    title="Choose which texture to use for the Earth"
                    value={texture}
                    onChange={(e) => onTextureChange(e.target.value)}
                  >
                    {TEXTURE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {padIfLong(opt.label)}
                      </option>
                    ))}
                  </select>
                </div>
              </label> 
        </div>
      )}
      <Tooltip text={tipText} x={tipPos.x} y={tipPos.y} />
    </div>
    </>
  );
}
