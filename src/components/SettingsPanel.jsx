import { useState } from "react";

const OPTIONS = [
  { label: "1 tick/sec", value: 1, smooth: "off" },
  { label: "2 ticks/sec", value: 0.5, smooth: "off" },
  { label: "8 ticks/sec", value: 0.125, smooth: "off" },
  { label: "Smooth", value: 0.015625, smooth: "smooth32" },
];

export default function SettingsPanel({
  tickStep,
  onTickStepChange,
  smoothMode,
  onSmoothModeChange,
}) {
  const [open, setOpen] = useState(false);

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
            <span>Tick</span>
            <select
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
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
