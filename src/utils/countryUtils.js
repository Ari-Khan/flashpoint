export function isoMatchesFeature(iso, feature) {
    if (!iso || !feature.properties) return false;
    const p = feature.properties;
    const s = iso.toUpperCase();

    return (
        p.adm0_a3?.toUpperCase() === s ||
        p.iso_a3_eh?.toUpperCase() === s ||
        p.gu_a3?.toUpperCase() === s
    );
}

export function getNationByIso(iso, nations) {
    if (!iso || !nations) return undefined;
    const s = iso.toUpperCase();
    if (nations[s]) return nations[s];
    return Object.values(nations).find(n => 
        n.iso2?.toUpperCase() === s || 
        n.iso3?.toUpperCase() === s ||
        n.name?.toUpperCase() === s
    );
}

export function getColorByIso(iso, nations, defaultColor = "#FF69B4") {
    const nation = getNationByIso(iso, nations);
    return nation?.defaultColor ?? defaultColor;
}