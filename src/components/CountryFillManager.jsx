import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import CountryFill from "./CountryFill";
import { useCountriesGeo } from "../data/useCountriesGeo";

export default function CountryFillManager({ activeIso2, nations }) {
  const geo = useCountriesGeo();
  const opacityRef = useRef({});

  // Immediate appearance when activated
  useFrame(() => {
    activeIso2.forEach(iso => {
      opacityRef.current[iso] = 0.35; // Set to full opacity immediately
    });
  });

  const activeFeatures = useMemo(() => {
    if (!geo) return [];

    return activeIso2
      .map(iso => {
        const feature = geo.features.find(f => isoMatchesFeature(iso, f));
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
          color={nationsByIso(iso, nations)}
          opacity={opacityRef.current[iso] || 0}
        />
      ))}
    </>
  );
}

function isoMatchesFeature(iso, feature) {
  const props = feature.properties || {};
  
  // Map common country codes to names for fallback matching
  const isoToName = {
    'DE': 'Germany',
    'ZA': 'South Africa'
  };
  
  return (
    props.iso_a2 === iso ||
    props.iso_a2_eh === iso ||
    props.iso_a3 === iso ||
    props.iso_a3_eh === iso ||
    props.postal === iso ||
    (isoToName[iso] && props.name === isoToName[iso])
  );
}

function nationsByIso(iso, nations) {
  const n = Object.values(nations).find(n => n.iso2 === iso);
  return n?.defaultColor ?? "#ff6600";
}
