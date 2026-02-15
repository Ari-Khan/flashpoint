const COLOR_CACHE = new Map();
let LAST_NATIONS_REF = null;

export function getColorByIso(iso, nations, defaultColor = "#FF69B4") {
    if (!iso || !nations) return defaultColor;

    if (nations !== LAST_NATIONS_REF) {
        COLOR_CACHE.clear();
        for (const [key, n] of Object.entries(nations)) {
            const color = n.defaultColor;
            if (!color) continue;

            const k = key.toUpperCase();
            COLOR_CACHE.set(k, color);

            if (n.iso2) COLOR_CACHE.set(n.iso2.toUpperCase(), color);
            if (n.iso3) COLOR_CACHE.set(n.iso3.toUpperCase(), color);
            if (n.name) COLOR_CACHE.set(n.name.toUpperCase(), color);
        }
        LAST_NATIONS_REF = nations;
    }

    return COLOR_CACHE.get(iso.toUpperCase()) ?? defaultColor;
}
