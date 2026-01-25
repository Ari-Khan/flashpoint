const COLOR_CACHE = new Map();
let LAST_NATIONS_REF = null;

export function getColorByIso(iso, nations, defaultColor = "#FF69B4") {
    if (!iso || !nations) return defaultColor;

    if (nations !== LAST_NATIONS_REF) {
        COLOR_CACHE.clear();
        Object.entries(nations).forEach(([key, n]) => {
            const color = n.defaultColor;
            if (!color) return;

            COLOR_CACHE.set(key.toUpperCase(), color);
            if (n.iso2) COLOR_CACHE.set(n.iso2.toUpperCase(), color);
            if (n.iso3) COLOR_CACHE.set(n.iso3.toUpperCase(), color);
            if (n.name) COLOR_CACHE.set(n.name.toUpperCase(), color);
        });
        LAST_NATIONS_REF = nations;
    }

    const s = iso.toUpperCase();
    return COLOR_CACHE.get(s) ?? defaultColor;
}