export function isoMatchesFeature(iso, feature) {
    const props = feature.properties || {};
    return (
        props.iso_a2 === iso ||
        props.iso_a2_eh === iso ||
        props.iso_a3 === iso ||
        props.iso_a3_eh === iso ||
        props.postal === iso
    );
}

export function getNationByIso(iso, nations) {
    // Try to match by iso2 (2-letter) or by key (3-letter)
    const byIso2 = Object.values(nations).find((n) => n.iso2 === iso);
    if (byIso2) return byIso2;
    if (nations[iso]) return nations[iso];
    return undefined;
}

export function getColorByIso(iso, nations, defaultColor = "#FF69B4") {
    const nation = getNationByIso(iso, nations);
    return nation?.defaultColor ?? defaultColor;
}

export function getCountryKey(feature) {
    const props = feature.properties || {};
    const id = props.iso_a3 || props.iso_a2 || props.adm0_a3 || props.name;
    
    if (id) return id;

    return `geom-${feature.geometry.type}-${JSON.stringify(feature.geometry.coordinates[0][0])}`;
}
