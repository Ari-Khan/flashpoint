import { useEffect, useState, useMemo } from "react";

export default function ControlPanel({ nations, onRun }) {
    const allCodes = useMemo(() => Object.keys(nations), [nations]);

    const aggressorCodes = useMemo(() => {
        return allCodes.filter((code) => {
            const w = nations[code]?.weapons;
            return (w?.icbm || 0) + (w?.slbm || 0) + (w?.airLaunch || 0) > 0;
        });
    }, [allCodes, nations]);

    const [actor, setActor] = useState("");
    const [target, setTarget] = useState("");

    useEffect(() => {
        if (aggressorCodes.length > 0 && !actor) {
            setActor(aggressorCodes[0]);
        }
    }, [aggressorCodes, actor]);

    useEffect(() => {
        if (allCodes.length > 0 && !target) {
            const defaultTarget = allCodes.find(
                (c) => c !== (actor || aggressorCodes[0])
            );
            setTarget(defaultTarget ?? allCodes[0]);
        }
    }, [allCodes, actor, target, aggressorCodes]);

    const error = useMemo(() => {
        if (aggressorCodes.length === 0)
            return "No aggressors available (no nations have nukes).";
        if (!actor || !target) return "Select valid countries.";
        if (actor === target) return "A country can't nuke itself.";
        return null;
    }, [actor, target, aggressorCodes]);

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
                            {nations[c]?.name || c}
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
                            {nations[c]?.name || c}
                        </option>
                    ))}
                </select>
            </div>

            <button
                onClick={() => {
                    if (!error) onRun(actor, target);
                }}
                disabled={!!error}
                className={error ? "dull" : ""}
                title={error || "Run Simulation"}
            >
                {error ? (
                    <span className="button-message">{error}</span>
                ) : (
                    "Run Simulation"
                )}
            </button>
        </div>
    );
}
