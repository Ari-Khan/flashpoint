function computeSalvoCount({ time, powerTier, remaining, initialStock = 100, ramp = 8 }) {
    const maxByTier = { 
        5: 25,
        4: 15,
        3: 8,
        2: 4,
        1: 2
    };
    const salvoCeiling = maxByTier[powerTier] ?? 2;
    const totalRemaining = Math.floor(remaining.icbm) + 
                           Math.floor(remaining.slbm) + 
                           Math.floor(remaining.air);
    if (totalRemaining <= 0) return 0;
    const timeProgress = 1 - Math.exp(-time / ramp);
    const basePotential = 1 + (salvoCeiling - 1) * timeProgress;
    const stockRatio = totalRemaining / Math.max(1, initialStock);
    const conservation = Math.pow(stockRatio, 0.4);
    const chaosMultiplier = 0.5 + Math.random();
    let count = basePotential * conservation * chaosMultiplier;
    const hardCap = salvoCeiling + (Math.random() > 0.8 ? 1 : 0);
    count = Math.min(count, hardCap);
    count = Math.round(count);
    return Math.max(1, Math.min(count, totalRemaining));
}

export { computeSalvoCount };