import { useEffect, useState } from "react";

let cache = null;

export function useCountriesGeo() {
    const [data, setData] = useState(cache);

    useEffect(() => {
        if (cache) {
            setTimeout(() => setData(cache), 0);
            return;
        }

        fetch("/src/data/country-shapes.geo.json")
            .then((r) => {
                if (!r.ok) throw new Error("Failed to load GeoJSON");
                return r.json();
            })
            .then((json) => {
                cache = json;
                setData(json);
            })
            .catch((err) => console.error("GeoJSON Load Error:", err));
    }, []);

    return data;
}