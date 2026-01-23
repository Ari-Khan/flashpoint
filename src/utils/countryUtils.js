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
    return Object.values(nations).find((n) => n.iso2 === iso);
}

export function getColorByIso(iso, nations, defaultColor = "#ff6600") {
    const nation = getNationByIso(iso, nations);
    return nation?.defaultColor ?? defaultColor;
}

export function getCountryKey(feature) {
    return (
        feature.properties?.iso_a3 ||
        feature.properties?.name ||
        JSON.stringify(feature.geometry.coordinates[0][0])
    );
}
