import { canLaunch } from "./weapons.js";

function selectWeightedCity(nation, decay = 0.6) {
    if (!nation) return null;
    const capital = {
        name: nation.capital ?? nation.name,
        lat: nation.lat,
        lon: nation.lon,
    };
    const cities = [capital].concat(nation.majorCities || []);
    if (!cities || cities.length === 0) return null;
    if (cities.length === 1) return cities[0];

    const weights = cities.map((_, i) => Math.pow(decay, i));
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);

    let r = Math.random() * totalWeight;
    for (let i = 0; i < cities.length; i++) {
        if (r < weights[i]) return cities[i];
        r -= weights[i];
    }

    return cities[0];
}

function computeCandidateWeight({ attacker, code, N, bilateral, state, lastStriker, docMap, globalChaos }) {
    const rel = bilateral?.[attacker]?.[code] ?? bilateral?.[code]?.[attacker] ?? 0;

    let weight = N.powerTier * 5 + globalChaos;

    if (code === lastStriker) weight *= (docMap || {})[N.doctrine] ?? 10;

    const nukesFromTarget = state.events.filter(
        (e) => e.from === code && e.to === attacker
    ).length;
    if (nukesFromTarget > 0) weight += 500 + nukesFromTarget * 50;

    const isEnemyAlly = state.events.some(
        (e) =>
            e.to === attacker &&
            N.faction &&
            nations[e.from]?.faction?.some((f) => N.faction?.includes(f))
    );
    // Note: keep this check conservative if nations reference isn't available
    if (isEnemyAlly) weight += 300;

    return { weight, nukesFromTarget };
}

function pickWeightedTarget({ attacker, lastStriker, world, state }) {
    const { nations, bilateral } = world;
    const attackerData = nations[attacker];
    const attackerFactions = attackerData.faction || [];
    const doctrine = attackerData.doctrine;

    const candidates = Object.keys(nations).filter(
        (code) =>
            code !== attacker &&
            (canLaunch(code, state) || state.involved.has(code))
    );

    if (!candidates.length) return { code: lastStriker, isBetrayal: false };

    const nukeCount = state.events.filter((e) => e.type === "launch").length;
    const globalChaos = nukeCount * 0.75;

    const docMap = {
        "no-first-use": 20,
        "retaliatory": 15,
        "threshold": 15,
        "latent": 10,
        "first-use": 5,
        "dormant": 5,
        "ambiguous": 3,
    };

    let focusOnLastStriker = docMap[doctrine] ?? 10;

    let totalWeight = 0;
    const weighted = candidates.map((code) => {
        const N = nations[code];
        const rel =
            bilateral?.[attacker]?.[code] ?? bilateral?.[code]?.[attacker] ?? 0;

        let weight = N.powerTier * 5 + globalChaos;

        if (code === lastStriker) weight *= focusOnLastStriker;

        const nukesFromTarget = state.events.filter(
            (e) => e.from === code && e.to === attacker
        ).length;
        if (nukesFromTarget > 0) weight += 500 + nukesFromTarget * 50;

        const isEnemyAlly = state.events.some(
            (e) =>
                e.to === attacker &&
                nations[e.from]?.faction?.some((f) => N.faction?.includes(f))
        );
        if (isEnemyAlly) weight += 300;

        const isAlly = attackerFactions.some((f) => N.faction?.includes(f));
        let canBetray = false;
        if (isAlly) {
            const betrayalChance = 0.05 + globalChaos * 0.01;
            if (Math.random() < betrayalChance) {
                canBetray = true;
                weight = 100 + globalChaos;
            } else {
                weight = 0;
            }
        }

        const safetyThreshold = Math.max(0, 8 - globalChaos * 0.2);
        if (rel > safetyThreshold && nukesFromTarget === 0 && !canBetray)
            weight *= 0.1;

        totalWeight += weight;
        return { code, weight, isBetrayal: canBetray };
    });

    let r = Math.random() * totalWeight;
    for (const w of weighted) {
        if ((r -= w.weight) <= 0)
            return { code: w.code, isBetrayal: w.isBetrayal };
    }
    return { code: lastStriker || candidates[0], isBetrayal: false };
}

export { selectWeightedCity, pickWeightedTarget };
