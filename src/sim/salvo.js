function computeSalvoCount({
    powerTier,
    remaining,
}) {
    const totalRemaining = Object.values(remaining).reduce((a, b) => a + Math.floor(b), 0);
    
    if (totalRemaining <= 0) return 0;

    const baseSalvo = powerTier * 5;
    const stockCap = totalRemaining * 0.10;
    
    const limitedSalvo = Math.min(baseSalvo, stockCap);

    const variance = 0.6 + Math.random() * 0.8;
    const finalCount = Math.round(limitedSalvo * variance);

    return Math.max(1, Math.min(finalCount, totalRemaining));
}

export { computeSalvoCount };