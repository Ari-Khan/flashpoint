function joinAllies({ victim, attacker, world, state }) {
    const { nations, bilateral } = world;
    const V = nations[victim];
    const joined = [];

    if (!V) return joined;

    for (const [code, C] of Object.entries(nations)) {
        if (state.involved.has(code)) continue;

        const isFactionMember =
            Array.isArray(C.faction) &&
            Array.isArray(V.faction) &&
            C.faction.some((f) => V.faction.includes(f));

        const relWithVictim =
            bilateral?.[code]?.[victim] ?? bilateral?.[victim]?.[code] ?? 0;
        const relWithAttacker =
            bilateral?.[code]?.[attacker] ?? bilateral?.[attacker]?.[code] ?? 0;

        const joinThreshold = 6;

        let desireToJoin = relWithVictim + C.powerTier;

        const timeBonus = (state.time || 0) * 0.5;
        desireToJoin += timeBonus;

        if (relWithAttacker < 0) {
            desireToJoin += Math.abs(relWithAttacker) * 0.3;
        }

        if (isFactionMember || desireToJoin > joinThreshold) {
            let doctrineModifier = 1.0;
            if (C.doctrine === "latent") doctrineModifier = 0.6;
            else if (C.doctrine === "dormant") doctrineModifier = 0.3;

            const reactionSpeed = C.powerTier * 0.2 * doctrineModifier;
            const effectiveIntensity = desireToJoin * doctrineModifier;

            if (Math.random() < 0.4 + reactionSpeed) {
                state.involved.add(code);
                joined.push(code);

                state.events.push({
                    t: state.time,
                    type: isFactionMember ? "faction-join" : "ally-join",
                    country: code,
                    reason: victim,
                    intensity: effectiveIntensity,
                });
            }
        }
    }

    return joined;
}

export { joinAllies };
