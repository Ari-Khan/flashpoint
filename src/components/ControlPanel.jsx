import { useEffect, useState } from "react";

export default function ControlPanel({ nations, onRun }) {
    const allCodes = Object.keys(nations);
    const aggressorCodes = allCodes.filter((code) => {
        const w = nations[code]?.weapons;
        return (w?.icbm || 0) + (w?.slbm || 0) + (w?.airLaunch || 0) > 0;
    });

    const [actor, setActor] = useState(aggressorCodes[0] ?? allCodes[0] ?? "");
    const [target, setTarget] = useState(() => {
        const defaultTarget = allCodes.find((c) => c !== (aggressorCodes[0] ?? allCodes[0]));
        return defaultTarget ?? allCodes[0] ?? "";
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        if (aggressorCodes.length === 0) {
            setError("No aggressors available (no nations have nukes).");
            return;
        }
        if (!actor || !target) {
            setError("Select valid countries.");
            return;
        }
        if (actor === target) {
            setError("A country can't nuke itself.");
        } else {
            setError(null);
        }
    }, [actor, target, aggressorCodes.length]);

    return (
        <div className="control-panel">
            <div>
                <label>Aggressor </label>
                <select
                    value={actor}
                    onChange={(e) => setActor(e.target.value)}
                >
                    {aggressorCodes.map((c) => (
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
                    {allCodes.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </div>

            <button
                onClick={() => {
                    if (error) return;
                    onRun(actor, target);
                }}
                disabled={!!error}
            >
                Run Simulation
            </button>
            {error && <div className="control-error">{error}</div>}
        </div>
    );
}
