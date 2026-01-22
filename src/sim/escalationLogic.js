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

export { launchStrike, shouldRetaliate, joinAllies };