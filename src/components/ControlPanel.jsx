import { useState } from "react";

export default function ControlPanel({ nations, onRun }) {
  const codes = Object.keys(nations);
  const [actor, setActor] = useState(codes[0]);
  const [target, setTarget] = useState(codes[1]);

  return (
    <div style={panelStyle}>
      <div>
        <label>Actor </label>
        <select value={actor} onChange={e => setActor(e.target.value)}>
          {codes.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Target </label>
        <select value={target} onChange={e => setTarget(e.target.value)}>
          {codes.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <button onClick={() => onRun(actor, target)}>
        Run Escalation
      </button>
    </div>
  );
}

const panelStyle = {
  position: "fixed",
  bottom: "16px",
  left: "16px",
  background: "#111",
  color: "#fff",
  padding: "12px",
  borderRadius: "8px",
  fontSize: "14px",
  zIndex: 1000
};
