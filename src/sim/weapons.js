function selectWeapon(stock) {
    if (!stock) return null;
    if (stock.icbm > 0) return "icbm";
    if (stock.slbm > 0) return "slbm";
    if (stock.air > 0) return "air";
    return null;
}

function canLaunch(country, state) {
    const r = state.remaining[country];
    if (!r) return false;
    return r.icbm + r.slbm + r.air > 0;
}

export { selectWeapon, canLaunch };
