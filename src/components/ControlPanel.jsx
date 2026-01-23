import { useState } from "react";

export default function ControlPanel({ nations, onRun }) {
    const codes = Object.keys(nations);
    const [actor, setActor] = useState(codes[0]);
    const [target, setTarget] = useState(codes[1]);

    return (
        <div className="control-panel">
            <div>
                <label>Aggressor </label>
                <select
                    value={actor}
                    onChange={(e) => setActor(e.target.value)}
                >
                    {codes.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label>Target </label>
                <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                >
                    {codes.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </div>

            <button onClick={() => onRun(actor, target)}>Run Simulation</button>
        </div>
    );
}
