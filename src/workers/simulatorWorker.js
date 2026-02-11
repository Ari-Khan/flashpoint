import { simulateEscalation } from "../sim/simulator.js";
import { loadWorld } from "../utils/loadData.js";

self.onmessage = function (e) {
    const { actor, target } = e.data;

    try {
        const world = loadWorld();
        const events = simulateEscalation({
            initiator: actor,
            firstTarget: target,
            world,
        });
        self.postMessage({ events });
    } catch (err) {
        self.postMessage({ error: err?.message || String(err) });
    }
};
