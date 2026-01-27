function processGlobalDevelopment(state, world) {
    const { nations } = world;
    const breakouts = [];

    const DOCTRINE_DATA = {
        threshold: { base: 2.0, required: 50 },
        latent: { base: 1.0, required: 100 },
        dormant: { base: 0.5, required: 150 },
    };

    for (const code in nations) {
        const stock = state.remaining[code];
        if (!stock) continue;

        const N = nations[code];
        const tier = N.powerTier || 1;

        if (stock.icbm + stock.slbm + stock.air > 0) {
            const rate = tier * 0.005;
            stock.icbm += rate;
            if (stock.air > 0) stock.air += rate * 0.5;
            if (stock.slbm > 0) stock.slbm += rate * 0.3;
            continue;
        }

        const data = DOCTRINE_DATA[N.doctrine];
        if (!data) continue;

        let progress = state.devProgress[code] ?? 0;
        if (progress === -1) continue;

        const swing = 0.2 + Math.random() * 1.6;
        progress += data.base * swing + tier * 0.1;

        if (progress >= data.required) {
            stock.icbm = tier * 3;
            stock.air = tier * 2;
            stock.slbm = tier >= 3 ? 2 : 0;

            Object.assign(N.weapons, {
                icbm: stock.icbm,
                airLaunch: stock.air,
                slbm: stock.slbm,
            });

            breakouts.push(code);
            state.devProgress[code] = -1;
        } else {
            state.devProgress[code] = progress;
        }
    }
    return breakouts;
}

export { processGlobalDevelopment };
