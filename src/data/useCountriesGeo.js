import { useEffect, useState } from "react";

let cache = null;

export function useCountriesGeo() {
    const [data, setData] = useState(cache);

    useEffect(() => {
        if (cache) {
            setTimeout(() => setData(cache), 0);
            return;
        }

        let cancelled = false;

        async function loadShards() {
            try {
                const idx = await import("./shards/index.json");
                const index = idx.default ?? idx;
                const shardMap = import.meta.glob('./shards/*.geo.json');
                const imports = index.map((s) => {
                    const fileName = (s.file || '').replace(/^\.\//, '');
                    const key = `./shards/${fileName}`;
                    const loader = shardMap[key];
                    if (!loader) return Promise.reject(new Error(`Missing shard: ${fileName}`));
                    return loader();
                });
                const modules = await Promise.all(imports);
                if (cancelled) return;
                const merged = { type: "FeatureCollection", features: [] };
                for (const m of modules) {
                    const json = m.default ?? m;
                    merged.features.push(...(json.features || []));
                }
                cache = merged;
                setData(merged);
            } catch (err) {
                console.error("GeoJSON shards load error:", err);
            }
        }

        loadShards();

        return () => { cancelled = true; };
    }, []);

    return data;
}