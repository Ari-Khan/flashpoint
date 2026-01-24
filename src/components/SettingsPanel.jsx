import { useState } from "react";

const OPTIONS = [
  { label: "1 tick/sec", value: 1, smooth: "off" },
  { label: "2 ticks/sec", value: 0.5, smooth: "off" },
  { label: "4 ticks/sec", value: 0.25, smooth: "off" },
  { label: "8 ticks/sec", value: 0.125, smooth: "off" },
  { label: "Smooth", value: 0.015625, smooth: "smooth32" },
];

const TEXTURE_OPTIONS = [
  { label: "Specular", value: "specular.png" },
  { label: "Topography", value: "topography.jpg" },
  { label: "Terrain", value: "terrain.jpg" },
  { label: "Bathymetry", value: "bathymetry.jpg" },
  { label: "Physical", value: "physical.jpg" },
  { label: "Night", value: "night.jpg" },
];

import Tooltip from "./Tooltip";

export default function SettingsPanel({
  tickStep,
  onTickStepChange,
  smoothMode,
  onSmoothModeChange,
  performanceSettings = {},
  onPerformanceChange = () => {},
  texture,
  onTextureChange = () => {},
  zoomMode = "Smooth",
  onZoomModeChange = () => {},
}) {
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
                value={`${tickStep}-${smoothMode}`}
                onChange={(e) => {
                  const [val, mode] = e.target.value.split("-");
                  onTickStepChange(Number(val));
                  onSmoothModeChange(mode);
                }}
              >
                {OPTIONS.map((opt) => (
                  <option
                    key={`${opt.value}-${opt.smooth}`}
                    value={`${opt.value}-${opt.smooth}`}
                  >
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
                <span data-tip="Choose zoom behavior: Smooth uses the smooth physics zoom; Block uses native immediate zoom." onMouseEnter={(e) => showTipFor(e.currentTarget)} onMouseLeave={hideTip}>Zoom</span>
                <div className="control">
                  <select
                    title="Choose zoom behavior"
                    value={zoomMode}
                    onChange={(e) => onZoomModeChange(e.target.value)}
                  >
                    <option value="Smooth">Smooth</option>
                    <option value="Block">Block</option>
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
  );
}
