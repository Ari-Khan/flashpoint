function computeSalvoCount({ time, powerTier, remaining, ramp = 6 }) {
    const maxByTier = {
        5: 25,
        4: 15,
        3: 8,
        2: 4,
        1: 2,
    };

    const max = maxByTier[powerTier] ?? 3;

    const base = 1 + (max - 1) * (1 - Math.exp(-time / ramp));

    const chaos = Math.floor(Math.random() * Math.min(2, time / 3 + 1));

    let count = Math.round(base + chaos);

    count = Math.min(count, remaining.icbm + remaining.slbm + remaining.air);

    return Math.max(1, count);
}

export { computeSalvoCount };
