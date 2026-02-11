import { selectWeapon } from "./weapons.js";
import { selectWeightedCity } from "./targeting.js";

function decrementStock(stock, weapon, count) {
    stock[weapon] -= count;
    if (stock[weapon] < 0) stock[weapon] = 0;
}

function makeLaunchEvent({ id, t, from, to, weapon, count, fromCity, toCity }) {
    const ev = {
        t,
        type: "launch",
        from,
        to,
        weapon,
        count,
        fromLat: fromCity?.lat,
        fromLon: fromCity?.lon,
        fromCity: fromCity?.name,
        toLat: toCity?.lat,
        toLon: toCity?.lon,
        toCity: toCity?.name,
    };

    ev.id = id;

    return ev;
}

function launchStrike({ from, to, state, maxPerStrike = 1, world }) {
    const stock = state.remaining[from];
    const weapon = selectWeapon(stock);

    if (!weapon) return false;

    const actualCount = Math.floor(maxPerStrike);
    decrementStock(stock, weapon, actualCount);

    const nations = world?.nations || {};
    const fromNation = nations[from] || {};
    const toNation = nations[to] || {};

    const fromCity = selectWeightedCity(fromNation);
    const toCity = selectWeightedCity(toNation);

    const id = `${from}-${to}-${state.time}-${state.nextEventId++}`;

    const ev = makeLaunchEvent({
        id,
        t: state.time,
        from,
        to,
        weapon,
        count: actualCount,
        fromCity,
        toCity,
    });
    ev.id = id;

    state.events.push(ev);

    state.involved.add(from);
    state.involved.add(to);
    state.struck.add(`${from}->${to}`);

    return true;
}

export { launchStrike };
