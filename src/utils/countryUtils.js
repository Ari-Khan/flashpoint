/**
 * Check if an ISO code matches a geojson feature's properties
 */
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

/**
 * Get nation data by ISO code
 */
export function getNationByIso(iso, nations) {
    return Object.values(nations).find((n) => n.iso2 === iso);
}

/**
 * Get color for a nation by ISO code
 */
export function getColorByIso(iso, nations, defaultColor = "#ff6600") {
    const nation = getNationByIso(iso, nations);
    return nation?.defaultColor ?? defaultColor;
}

/**
 * Get unique country code key for caching
 */
export function getCountryKey(feature) {
    return (
        feature.properties?.iso_a3 ||
        feature.properties?.name ||
        JSON.stringify(feature.geometry.coordinates[0][0])
    );
}
