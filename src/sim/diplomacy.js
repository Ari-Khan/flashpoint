const DOCTRINE_MULT = { threshold: 0.8, latent: 0.6, dormant: 0.4 };

function joinAllies({ victim, attacker, world, state }) {
    const { nations, bilateral } = world;
    const V = nations[victim];
    if (!V) return [];

    const joined = [];
    const vFactions = V.faction || [];

    for (const code in nations) {
        if (state.involved.has(code) || code === victim) continue;

        const C = nations[code];
        const relV =
            bilateral?.[code]?.[victim] ?? bilateral?.[victim]?.[code] ?? 0;
        const relA =
            bilateral?.[code]?.[attacker] ?? bilateral?.[attacker]?.[code] ?? 0;

        const timeBonus = (state.time || 0) * 0.1;
        const attackerBias = -0.5 * relA;
        const desire = relV + (C.powerTier ?? 1) + timeBonus + attackerBias;

        const isFactionMember = (C.faction || []).some((f) =>
            vFactions.includes(f)
        );

        if (isFactionMember || desire > 10) {
            const mod = DOCTRINE_MULT[C.doctrine] ?? 1.0;

            const baseChance = isFactionMember ? 0.3 : 0.1;
            const powerBonus = C.powerTier * 0.1 * mod;
            const finalChance = baseChance + powerBonus;

            if (Math.random() < finalChance) {
                state.involved.add(code);
                joined.push(code);

                state.events.push({
                    t: state.time,
                    type: isFactionMember ? "faction-join" : "ally-join",
                    country: code,
                    reason: victim,
                    intensity: Number(desire.toFixed(2)),
                });
            }
        }
    }
    return joined;
}

export { joinAllies };
