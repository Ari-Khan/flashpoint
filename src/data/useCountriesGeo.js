import { useEffect, useState } from "react";

let cache = null;

export function useCountriesGeo() {
    const [data, setData] = useState(cache);

    useEffect(() => {
        if (cache) {
            queueMicrotask(() => setData(cache));
            return;
        }

        fetch("/src/data/country-shapes.geo.json")
            .then((r) => r.json())
            .then((json) => {
                cache = json;
                setData(json);
            });
    }, []);

    return data;
}
