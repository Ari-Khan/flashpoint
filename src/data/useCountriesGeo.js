import { useEffect, useState } from "react";
import countriesGeo from "./country-shapes.geo.json";

let cache = null;

export function useCountriesGeo() {
    const [data, setData] = useState(cache);

    useEffect(() => {
        if (cache) {
            setTimeout(() => setData(cache), 0);
            return;
        }

        cache = countriesGeo;
        setData(countriesGeo);
    }, []);

    return data;
}