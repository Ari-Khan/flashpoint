function selectWeapon(stock) {
    if (!stock) return null;

    if (stock.icbm > 0 || stock.slbm > 0) {
        const useIcbm = Math.random() < 0.8;
        if (useIcbm && stock.icbm > 0) return "icbm";
        if (stock.slbm > 0) return "slbm";
        return "icbm";
    }

    return stock.air > 0 ? "air" : null;
}

function canLaunch(country, state) {
    const r = state.remaining[country];
    if (!r) return false;
    return r.icbm + r.slbm + r.air > 0;
}

export { selectWeapon, canLaunch };
