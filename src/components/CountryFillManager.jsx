import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import CountryFill from "./CountryFill";
import { useCountriesGeo } from "../data/useCountriesGeo";

export default function CountryFillManager({ activeIso2, nations }) {
  const geo = useCountriesGeo();
  const opacityRef = useRef({});

  // Immediate appearance when activated
  useFrame((_, delta) => {
    activeIso2.forEach(iso => {
      opacityRef.current[iso] = 0.35; // Set to full opacity immediately
    });
  });

  const activeFeatures = useMemo(() => {
    if (!geo) return [];

    return activeIso2
      .map(iso =>
        geo.features.find(f => f.properties.iso_a2 === iso)
      )
      .filter(Boolean);
  }, [geo, activeIso2]);

  if (!geo) return null;

  return (
    <>
      {activeFeatures.map(f => {
        const iso = f.properties.iso_a2;
        return (
          <CountryFill
            key={iso}
            feature={f}
            color={nationsByIso(iso, nations)}
            opacity={opacityRef.current[iso] || 0}
          />
        );
      })}
    </>
  );
}

function nationsByIso(iso, nations) {
  const n = Object.values(nations).find(n => n.iso2 === iso);
  return n?.defaultColor ?? "#ff6600";
}
