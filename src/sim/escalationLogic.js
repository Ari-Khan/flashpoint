function launchStrike({ from, to, nations, state, maxPerStrike = 1 }) {
  const stock = state.remaining[from];
  if (!stock) return false;

  let weapon = null;

  if (stock.icbm > 0) weapon = "icbm";
  else if (stock.slbm > 0) weapon = "slbm";
  else if (stock.air > 0) weapon = "air";
  else return false;

  // consume nukes
  stock[weapon] -= maxPerStrike;
  if (stock[weapon] < 0) stock[weapon] = 0;

  state.events.push({
    t: state.time,
    type: "launch",
    from,
    to,
    weapon,
    count: maxPerStrike
  });

  // involvement MUST happen here
  state.involved.add(from);
  state.involved.add(to);

  // mark strike
  state.struck.add(`${from}->${to}`);

  return true;
}

function joinAllies({ victim, world, state }) {
  const { nations, bilateral } = world;
  const V = nations[victim];
  const joined = [];

  if (!V) return joined;

  for (const [code, C] of Object.entries(nations)) {
    if (state.involved.has(code)) continue;
    if (!C) continue;

    // faction = instant join
    if (
      Array.isArray(C.faction) &&
      Array.isArray(V.faction) &&
      C.faction.some(f => V.faction.includes(f))
    ) {
      state.involved.add(code);
      joined.push(code);
      state.events.push({
        t: state.time,
        type: "faction-join",
        country: code,
        reason: victim
      });
      continue;
    }

    // non-faction ally
    const rel =
      bilateral?.[code]?.[victim] ??
      bilateral?.[victim]?.[code] ??
      0;

    if (rel + C.powerTier > 6) {
      state.involved.add(code);
      joined.push(code);
      state.events.push({
        t: state.time,
        type: "ally-join",
        country: code,
        reason: victim
      });
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

  const candidates = Object.keys(nations).filter(code => {
    if (code === attacker) return false;
    if (!state.remaining[code]) return false;
    return true;
  });

  if (!candidates.length) return lastStriker;

  let totalWeight = 0;

  const weighted = candidates.map(code => {
    const N = nations[code];
    let weight = 1;

    // 🔥 STRONG retaliation bias
    if (code === lastStriker) {
      weight += 15; // <-- THIS is the main fix
    }

    // 🧨 aggressor bias (if they initiated earlier)
    if ([...state.struck].some(s => s.startsWith(`${code}->`))) {
      weight += 5;
    }

    // 💪 power still matters, but less than revenge
    weight += (N.powerTier ?? 1) * 1.2;

    // 😡 relations
    const rel =
      bilateral?.[attacker]?.[code] ??
      bilateral?.[code]?.[attacker] ??
      0;

    if (rel < 0) {
      weight += Math.abs(rel) * 2;
    } else {
      // friendly / neutral = VERY discouraged
      weight *= 0.08;
    }

    // 🧨 already involved nations are more fair game
    if (state.involved.has(code)) weight += 2;

    totalWeight += weight;
    return { code, weight };
  });

  // 🎲 weighted random
  let r = Math.random() * totalWeight;
  for (const w of weighted) {
    r -= w.weight;
    if (r <= 0) return w.code;
  }

  return lastStriker;
}

export { launchStrike, shouldRetaliate, joinAllies, canLaunch, pickWeightedTarget };