import { useMemo } from "react";
import CountryFill from "./CountryFill";
import { useCountriesGeo } from "../data/useCountriesGeo";
import { isoMatchesFeature, getColorByIso } from "../utils/countryUtils";

export default function CountryFillManager({ activeIso2 = [], nations = {} }) {
    const geo = useCountriesGeo();

    const activeFeatures = useMemo(() => {
        if (!geo || !activeIso2.length) return [];
        
        const uniqueIsos = Array.from(new Set(activeIso2));
        
        return uniqueIsos
            .map((iso) => {
                const feature = geo.features.find((f) => isoMatchesFeature(iso, f));
                if (!feature) return null;

                const color = getColorByIso(iso, nations);
                return { iso, feature, color };
            })
            .filter(Boolean);
    }, [geo, activeIso2, nations]);

    if (!geo) return null;

    return (
        <group>
            {activeFeatures.map(({ iso, feature, color }) => (
                <CountryFill
                    key={`${iso}-${color}`}
                    feature={feature}
                    color={color}
                    opacity={0.35}
                />
            ))}
        </group>
    );
}