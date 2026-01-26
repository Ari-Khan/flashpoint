function selectWeapon(stock) {
    if (!stock) return null;
    if (stock.icbm > 0) return "icbm";
    if (stock.slbm > 0) return "slbm";
    if (stock.air > 0) return "air";
    return null;
}

function shouldRetaliate(nation) {
    if (!nation) return false;
    const w = nation.weapons || {};
    return (w.icbm || 0) + (w.slbm || 0) + (w.airLaunch || 0) > 0;
}

function canLaunch(country, state) {
    const r = state.remaining[country];
    if (!r) return false;
    return r.icbm + r.slbm + r.air > 0;
}

export { selectWeapon, shouldRetaliate, canLaunch };
