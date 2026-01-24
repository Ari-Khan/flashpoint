import { useEffect, useMemo, useState } from "react";

export default function ControlPanel({ nations, onRun }) {
    const codes = Object.keys(nations);
    const [actor, setActor] = useState(codes[0]);
    const [target, setTarget] = useState(codes[1]);
    const [error, setError] = useState(null);

    const hasNukes = useMemo(() => {
        const entry = nations[actor];
        if (!entry?.weapons) return false;
        const w = entry.weapons;
        return (w.icbm || 0) + (w.slbm || 0) + (w.airLaunch || 0) > 0;
    }, [actor, nations]);

    useEffect(() => {
        queueMicrotask(() => {
            if (actor === target) {
                setError("A country can't nuke itself.");
            } else if (!hasNukes) {
                setError(`${actor} has no nuclear weapons.`);
            } else {
                setError(null);
            }
        });
    }, [actor, target, hasNukes]);

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
