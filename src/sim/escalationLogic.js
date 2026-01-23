function selectWeapon(stock) {
    if (!stock) return null;
    if (stock.icbm > 0) return "icbm";
    if (stock.slbm > 0) return "slbm";
    if (stock.air > 0) return "air";
    return null;
}

function launchStrike({ from, to, nations, state, maxPerStrike = 1 }) {
    const stock = state.remaining[from];
    const weapon = selectWeapon(stock);

    if (!weapon) return false;

    const actualCount = Math.floor(maxPerStrike);
    stock[weapon] -= actualCount;
    if (stock[weapon] < 0) stock[weapon] = 0;

    state.events.push({
        t: state.time,
        type: "launch",
        from,
        to,
        weapon,
        count: actualCount,
    });

    state.involved.add(from);
    state.involved.add(to);
    state.struck.add(`${from}->${to}`);

    return true;
}
function joinAllies({ victim, attacker, world, state }) {
    const { nations, bilateral } = world;
    const V = nations[victim];
    const joined = [];

    if (!V) return joined;

    for (const [code, C] of Object.entries(nations)) {
        if (state.involved.has(code)) continue;

        const isFactionMember = Array.isArray(C.faction) && 
                                Array.isArray(V.faction) && 
                                C.faction.some(f => V.faction.includes(f));

        const relWithVictim = bilateral?.[code]?.[victim] ?? bilateral?.[victim]?.[code] ?? 0;
        const relWithAttacker = bilateral?.[code]?.[attacker] ?? bilateral?.[attacker]?.[code] ?? 0;

        const joinThreshold = 6; 
        
        let desireToJoin = relWithVictim + C.powerTier;
        
        const timeBonus = (state.time || 0) * 0.5;
        desireToJoin += timeBonus;

        if (relWithAttacker < 0) {
            desireToJoin += Math.abs(relWithAttacker) * 0.3;
        }

        if (isFactionMember || desireToJoin > joinThreshold) {
            const reactionSpeed = C.powerTier * 0.2;
            if (Math.random() < 0.4 + reactionSpeed) {
                state.involved.add(code);
                joined.push(code);
                
                state.events.push({
                    t: state.time,
                    type: isFactionMember ? "faction-join" : "ally-join",
                    country: code,
                    reason: victim,
                    intensity: desireToJoin
                });
            }
        }
    }

    return joined;
}
function shouldRetaliate(nation) {
    if (!nation) return false;

    switch (nation.doctrine) {
        case "threshold":
            return false;
        case "ambiguous":
            return Math.random() > 0.4;
        case "no-first-use":
        case "first-use":
        case "retaliatory":
        case "escalate-to-deescalate":
        default:
            return true;
    }
}

function canLaunch(country, state) {
    const r = state.remaining[country];
    if (!r) return false;
    return r.icbm + r.slbm + r.air > 0;
}

function pickWeightedTarget({ attacker, lastStriker, world, state }) {
    const { nations, bilateral } = world;
    const attackerData = nations[attacker];
    const attackerFactions = attackerData.faction || [];
    const doctrine = attackerData.doctrine;

    const candidates = Object.keys(nations).filter(code => 
        code !== attacker && (canLaunch(code, state) || state.involved.has(code))
    );

    if (!candidates.length) return { code: lastStriker, isBetrayal: false };

    const escalationScale = 1 + ((state.time || 0) * 0.1); 
    const nukeCount = state.events.filter(e => e.type === 'nuke').length;
    const globalChaos = nukeCount * 0.75;

    let focusOnLastStriker = 2.0, strayBias = 1.0;
    const docMap = { "retaliatory": [15, 0.2], "no-first-use": [15, 0.2], "first-use": [5, 3.5], "ambiguous": [1.2, 6], "threshold": [1.2, 6] };
    [focusOnLastStriker, strayBias] = docMap[doctrine] || [2, 1];

    strayBias *= (1 + (globalChaos * 0.1));

    let totalWeight = 0;
    const weighted = candidates.map((code) => {
        const N = nations[code];
        const rel = bilateral?.[attacker]?.[code] ?? bilateral?.[code]?.[attacker] ?? 0;
        const hasNukes = canLaunch(code, state);
        
        let weight = (rel < 0 ? Math.pow(Math.abs(rel), 2) * 5 * escalationScale : 0) * strayBias;
        
        const fogOfWar = Math.random() * globalChaos * 10;
        weight += (N.powerTier * 2) + globalChaos + fogOfWar;

        if (code === lastStriker) weight *= 0.2; 

        const nukesFromTarget = state.events.filter(e => e.from === code && e.to === attacker).length;
        if (nukesFromTarget > 0) weight += (100 + nukesFromTarget * 15) * focusOnLastStriker;

        const isEnemyAlly = state.events.some(e => e.to === attacker && nations[e.from]?.faction?.some(f => N.faction?.includes(f)));
        if (isEnemyAlly) {
            const softTargetBonus = !hasNukes ? 200 : 0;
            weight += (150 + softTargetBonus) * (strayBias * 0.5);
        }

        const isAlly = attackerFactions.some(f => N.faction?.includes(f));
        let canBetray = false;
        if (isAlly) {
            const betrayalChance = 0.1 + (globalChaos * 0.02);
            if (Math.random() < betrayalChance) {
                canBetray = true;
                weight += (50 + globalChaos); 
            }
        }

        if (isAlly && !canBetray) weight = 0;
        const safetyThreshold = Math.max(0, 5 - (globalChaos * 0.1));
        if (rel > safetyThreshold && nukesFromTarget === 0) weight *= 0.01;

        totalWeight += weight;
        return { code, weight, isBetrayal: canBetray && isAlly };
    });

    let r = Math.random() * totalWeight;
    for (const w of weighted) {
        if ((r -= w.weight) <= 0) return { code: w.code, isBetrayal: w.isBetrayal };
    }
    return { code: candidates[Math.floor(Math.random() * candidates.length)], isBetrayal: false };
}
function processGlobalDevelopment(state, world) {
    const { nations } = world;

    const breakouts = [];
    for (const [code, N] of Object.entries(nations)) {
        if (!state.remaining[code]) continue;
        const stock = state.remaining[code];
        const isNuclear = (stock.icbm + stock.slbm + stock.air) > 0;
        if (isNuclear) {
            const rate = (N.powerTier || 1) * 0.005;
            stock.icbm += rate;
            if (stock.air > 0) stock.air += rate * 0.5;
            if (stock.slbm > 0) stock.slbm += rate * 0.3;
            continue; 
        }
        if (N.doctrine === "threshold" || N.doctrine === "latent") {
            if (state.devProgress[code] === undefined) state.devProgress[code] = 0;
            if (state.devProgress[code] === -1) continue; 
            const base = N.doctrine === "threshold" ? 2.0 : 1.0;
            const swing = 0.2 + (Math.random() * 1.6);
            const floor = (N.powerTier || 1) * 0.1;
            state.devProgress[code] += (base * swing) + floor;
            if (state.devProgress[code] >= 100) {
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

export {
    launchStrike,
    shouldRetaliate,
    joinAllies,
    canLaunch,
    pickWeightedTarget,
    processGlobalDevelopment
};
