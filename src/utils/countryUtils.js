export function isoMatchesFeature(iso, feature) {
    if (!iso || !feature.properties) return false;
    const p = feature.properties;
    const s = iso.toUpperCase();

    const isMatch = (
        p.adm0_iso?.toUpperCase() === s ||
        p.iso_a3_eh?.toUpperCase() === s ||
        p.adm0_a3?.toUpperCase() === s ||
        p.iso_a3?.toUpperCase() === s ||
        p.iso_a2_eh?.toUpperCase() === s ||
        (p.name && p.name.toUpperCase() === s)
    );

    if (!isMatch) return false;

    const type = p.type?.toLowerCase() || "";
    
    if (type.includes("dependency")) return false;
    return type.includes("country") || p.scalerank < 2;
}

export function getNationByIso(iso, nations) {
    if (!iso || !nations) return undefined;
    const s = iso.toUpperCase();
    if (nations[s]) return nations[s];
    return Object.values(nations).find(n => n.iso2?.toUpperCase() === s || n.iso3?.toUpperCase() === s);
}

export function getColorByIso(iso, nations, defaultColor = "#FF69B4") {
    const nation = getNationByIso(iso, nations);
    return nation?.defaultColor ?? defaultColor;
}

export function getCountryKey(feature) {
    if (!feature) return null;
    const p = feature.properties || {};
    return p.wikidataid || p.ISO_A3 || p.iso_a3 || p.name || "unknown";
}