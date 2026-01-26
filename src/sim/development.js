function processGlobalDevelopment(state, world) {
    const { nations } = world;

    const breakouts = [];
    for (const [code, N] of Object.entries(nations)) {
        if (!state.remaining[code]) continue;
        const stock = state.remaining[code];
        const isNuclear = stock.icbm + stock.slbm + stock.air > 0;
        if (isNuclear) {
            const rate = (N.powerTier || 1) * 0.005;
            stock.icbm += rate;
            if (stock.air > 0) stock.air += rate * 0.5;
            if (stock.slbm > 0) stock.slbm += rate * 0.3;
            continue;
        }
        if (
            N.doctrine === "threshold" ||
            N.doctrine === "latent" ||
            N.doctrine === "dormant"
        ) {
            if (state.devProgress[code] === undefined)
                state.devProgress[code] = 0;
            if (state.devProgress[code] === -1) continue;
            const base =
                N.doctrine === "threshold"
                    ? 2.0
                    : N.doctrine === "latent"
                      ? 1.0
                      : 0.5;
            const required =
                N.doctrine === "threshold"
                    ? 50
                    : N.doctrine === "latent"
                      ? 100
                      : 150;
            const swing = 0.2 + Math.random() * 1.6;
            const floor = (N.powerTier || 1) * 0.1;
            state.devProgress[code] += base * swing + floor;
            if (state.devProgress[code] >= required) {
                const tier = N.powerTier || 1;
                stock.icbm = tier * 3;
                stock.air = tier * 2;
                stock.slbm = tier >= 3 ? 2 : 0;
                N.weapons.icbm = stock.icbm;
                N.weapons.airLaunch = stock.air;
                N.weapons.slbm = stock.slbm;
                breakouts.push(code);
                state.devProgress[code] = -1;
            }
        }
    }
    return breakouts;
}

export { processGlobalDevelopment };
