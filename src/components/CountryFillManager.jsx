import { useMemo } from "react";
import CountryFill from "./CountryFill";
import { useCountriesGeo } from "../data/useCountriesGeo";
import { isoMatchesFeature, getColorByIso } from "../utils/countryUtils";

export default function CountryFillManager({ activeIso2, nations }) {
    const geo = useCountriesGeo();

    const activeFeatures = useMemo(() => {
        if (!geo) return [];
        return activeIso2
            .map((iso) => {
                const feature = geo.features.find((f) => isoMatchesFeature(iso, f));
                return feature ? { iso, feature } : null;
            })
            .filter(Boolean);
    }, [geo, activeIso2]);

    if (!geo) return null;

    return (
        <>
            {activeFeatures.map(({ iso, feature }) => (
                <CountryFill
                    key={iso}
                    feature={feature}
                    color={getColorByIso(iso, nations)}
                    opacity={0.35}
                />
            ))}
        </>
    );
}