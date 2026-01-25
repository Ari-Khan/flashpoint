import { useMemo } from "react";
import CountryFill from "./CountryFill.jsx";
import { useCountriesGeo } from "../data/useCountriesGeo.js";
import { isoMatchesFeature, getColorByIso } from "../utils/countryUtils.js";

export default function CountryFillManager({ activeIsos = [], nations = {} }) {
    const geo = useCountriesGeo();

    const activeGroups = useMemo(() => {
        if (!geo || !activeIsos.length) return [];
        
        const uniqueIsos = Array.from(new Set(activeIsos));
        
        return uniqueIsos
            .map((iso) => {
                const matchingFeatures = geo.features.filter((f) => isoMatchesFeature(iso, f));
                if (matchingFeatures.length === 0) return null;

                const color = getColorByIso(iso, nations);
                return { iso, matchingFeatures, color };
            })
            .filter(Boolean);
    }, [geo, activeIsos, nations]);

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