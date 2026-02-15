import { useEffect, useState } from "react";

let cache = null;
let loadPromise = null;

const EMPTY_IDS = [];

export function useCountriesGeo(activeCountryIds = EMPTY_IDS) {
    const [data, setData] = useState(cache);

    useEffect(() => {
        if (cache) return;

        if (!loadPromise) {
            loadPromise = (async () => {
                const worker = new Worker(
                    new URL("../utils/geoHandler.js", import.meta.url),
                    { type: "module" }
                );

                try {
                    const shardMap = import.meta.glob(
                        "../data/shards/*.geo.json"
                    );
                    const modules = await Promise.all(
                        Object.values(shardMap).map((l) => l())
                    );
                    const shardData = modules.map((m) => m.default ?? m);

                    return new Promise((resolve, reject) => {
                        worker.onmessage = (e) => {
                            if (e.data.success) {
                                cache = e.data.data;
                                resolve(cache);
                            } else {
                                reject(e.data.error);
                            }
                            worker.terminate();
                        };
                        worker.onerror = reject;
                        worker.postMessage({ shardData, activeCountryIds });
                    });
                } catch (err) {
                    worker.terminate();
                    loadPromise = null;
                    throw err;
                }
            })();
        }

        loadPromise.then(setData).catch(console.error);
    }, [activeCountryIds]);

    return data;
}
