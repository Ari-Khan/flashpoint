import { simulateEscalation } from "../sim/simulator.js";
import { loadWorld } from "../utils/loadData.js";

let worldData = null;

async function init() {
    try {
        worldData = await loadWorld();
    } catch (err) {
        self.postMessage({
            error: "Failed to initialize world: " + err.message,
        });
    }
}

const initPromise = init();

self.onmessage = async (e) => {
    await initPromise;

    if (!worldData) return;

    const { actor, target } = e.data;

    try {
        const events = simulateEscalation({
            initiator: actor,
            firstTarget: target,
            world: worldData,
        });

        self.postMessage({ events });
    } catch (err) {
        self.postMessage({ error: err.message });
    }
};
