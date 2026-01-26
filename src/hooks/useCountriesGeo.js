import { useEffect, useState } from "react";

let cache = null;

export function useCountriesGeo(activeCountryIds = []) {
    const [data, setData] = useState(cache);

    useEffect(() => {
        if (cache) {
            setData(cache);
            return;
        }

        let cancelled = false;
        const worker = new Worker(
            new URL("../utils/geoHandler.js", import.meta.url),
            {
                type: "module",
            }
        );

        async function initLoad() {
            try {
                const shardMap = import.meta.glob("../data/shards/*.geo.json");
                const loaders = Object.values(shardMap).map((loader) =>
                    loader()
                );
                const modules = await Promise.all(loaders);

                if (cancelled) return;

                const shardData = modules.map((m) => m.default ?? m);

                worker.postMessage({ shardData, activeCountryIds });

                worker.onmessage = (e) => {
                    if (cancelled) return;
                    const { success, data, error } = e.data;
                    if (success) {
                        cache = data;
                        setData(data);
                    } else {
                        console.error("Worker Error:", error);
                    }
                    worker.terminate();
                };
            } catch (err) {
                console.error("Main Thread Load Error:", err);
                worker.terminate();
            }
        }

        initLoad();

        return () => {
            cancelled = true;
            worker.terminate();
        };
    }, [activeCountryIds.length]);

    return data;
}
