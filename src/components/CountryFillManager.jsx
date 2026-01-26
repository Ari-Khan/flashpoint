import { useMemo } from "react";
import CountryFill from "./CountryFill.jsx";
import { useCountriesGeo } from "../hooks/useCountriesGeo.js";
import { getColorByIso } from "../utils/countryUtils.js";

export default function CountryFillManager({ activeIsos = [], nations = {} }) {
    const geo = useCountriesGeo();

    const geoMap = useMemo(() => {
        if (!geo?.features) return null;
        const map = new Map();

        geo.features.forEach((f) => {
            const p = f.properties || {};
            const keys = [p.adm0_a3, p.iso_a3_eh, p.gu_a3];

            const seen = new Set();
            keys.forEach((key) => {
                if (key && typeof key === "string" && key !== "-99") {
                    const normalized = key.toUpperCase();
                    if (!seen.has(normalized)) {
                        if (!map.has(normalized)) map.set(normalized, []);
                        map.get(normalized).push(f);
                        seen.add(normalized);
                    }
                }
            });
        });
        return map;
    }, [geo]);

    const activeGroups = useMemo(() => {
        if (!geoMap || !activeIsos.length) return [];

        const uniqueIsos = Array.from(
            new Set(activeIsos.map((i) => i.toUpperCase()))
        );
        const groups = [];

        for (const iso of uniqueIsos) {
            const matchingFeatures = geoMap.get(iso);
            if (matchingFeatures) {
                groups.push({
                    iso,
                    matchingFeatures,
                    color: getColorByIso(iso, nations),
                });
            }
        }
        return groups;
    }, [geoMap, activeIsos, nations]);

    if (!geo) return null;

    return (
        <group>
            {activeGroups.map(({ iso, matchingFeatures, color }) => (
                <CountryFill
                    key={iso}
                    features={matchingFeatures}
                    countryCode={iso}
                    color={color}
                    opacity={0.35}
                />
            ))}
        </group>
    );
}
