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

    stock[weapon] -= maxPerStrike;
    if (stock[weapon] < 0) stock[weapon] = 0;

    state.events.push({
        t: state.time,
        type: "launch",
        from,
        to,
        weapon,
        count: maxPerStrike,
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

    const currentStock = (state.remaining[attacker]?.icbm || 0) + (state.remaining[attacker]?.slbm || 0) + (state.remaining[attacker]?.air || 0);
    const initialStock = (attackerData.weapons.icbm || 0) + (attackerData.weapons.slbm || 0) + (attackerData.weapons.airLaunch || 0);
    const isDesperate = initialStock > 0 && (currentStock / initialStock) < 0.2;

    let focusOnLastStriker = 2.0, strayBias = 1.0;
    const docMap = { "retaliatory": [15, 0.2], "no-first-use": [15, 0.2], "first-use": [5, 3.5], "ambiguous": [1.2, 6], "threshold": [1.2, 6] };
    [focusOnLastStriker, strayBias] = docMap[doctrine] || [2, 1];

    if (isDesperate) { focusOnLastStriker *= 0.15; strayBias *= 8.0; }

    const globalChaos = state.events.filter(e => e.type === 'nuke').length * 0.5;
    let totalWeight = 0;

    const weighted = candidates.map((code) => {
        const N = nations[code];
        const rel = bilateral?.[attacker]?.[code] ?? bilateral?.[code]?.[attacker] ?? 0;
        const hasNukes = canLaunch(code, state);
        
        let weight = (rel < 0 ? Math.pow(Math.abs(rel), 2) * 5 : 0) * strayBias;
        weight += (N.powerTier * 2) + globalChaos;

        const nukesFromTarget = state.events.filter(e => e.from === code && e.to === attacker).length;
        if (nukesFromTarget > 0) weight += (100 + nukesFromTarget * 15) * focusOnLastStriker;
        if (code === lastStriker) weight *= focusOnLastStriker;

        const isEnemyAlly = state.events.some(e => e.to === attacker && nations[e.from]?.faction?.some(f => N.faction?.includes(f)));
        if (isEnemyAlly) {
            const softTargetBonus = !hasNukes ? 200 : 0;
            weight += (150 + softTargetBonus) * (strayBias * 0.5);
        }

        const isAlly = attackerFactions.some(f => N.faction?.includes(f));
        let canBetray = false;
        if (isAlly && attackerData.powerTier < 5) {
            const allyStock = (state.remaining[code]?.icbm || 0) + (state.remaining[code]?.slbm || 0) + (state.remaining[code]?.air || 0);
            const allyInitial = (N.weapons.icbm || 0) + (N.weapons.slbm || 0) + (N.weapons.airLaunch || 0);
            if (allyInitial > 0 && (allyStock / allyInitial) < 0.25 && Math.random() < 0.3) {
                canBetray = true;
                weight += 40;
            }
        }

        if (isAlly && !canBetray) weight = 0;
        if (rel > 5 && nukesFromTarget === 0) weight *= 0.01;

        totalWeight += weight;
        return { code, weight, isBetrayal: canBetray && isAlly };
    });

    let r = Math.random() * totalWeight;
    for (const w of weighted) {
        if ((r -= w.weight) <= 0) return { code: w.code, isBetrayal: w.isBetrayal };
    }
    return { code: lastStriker, isBetrayal: false };
}

export {
    launchStrike,
    shouldRetaliate,
    joinAllies,
    canLaunch,
    pickWeightedTarget,
};
