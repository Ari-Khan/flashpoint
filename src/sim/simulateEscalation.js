import { createEscalationState } from "./escalationState";
import { launchStrike, shouldRetaliate, joinAllies } from "./escalationLogic";
import { computeSalvoCount } from "./salvoLogic";

export function simulateEscalation({
  initiator,
  firstTarget,
  world,
  maxEvents = 10000
}) {
  const { nations } = world;
  const state = createEscalationState();

  // Init remaining nukes
  for (const k in nations) {
    state.remaining[k] = {
      icbm: nations[k].weapons.icbm,
      slbm: nations[k].weapons.slbm,
      air: nations[k].weapons.airLaunch
    };
  }

  // Event queue
  const queue = [];

  queue.push({
    type: "strike",
    from: initiator,
    to: firstTarget,
    reason: "initial"
  });

  while (queue.length > 0) {
    if (state.events.length >= maxEvents) break;

    const event = queue.shift();
    const { from, to } = event;

    if (!canLaunch(from, state)) continue;

    const count = computeSalvoCount({
      time: state.time,
      powerTier: nations[from].powerTier,
      remaining: state.remaining[from]
    });

    const used = launchStrike({
      from,
      to,
      nations,
      state,
      maxPerStrike: count
    });

    if (!used) continue;
    state.time++;

    // Retaliation
    if (shouldRetaliate(nations[to])) {
      const target = pickWeightedTarget({
        attacker: to,
        lastStriker: from,
        world,
        state
      });

      queue.push({
        type: "strike",
        from: to,
        to: target,
        reason: target === from ? "retaliation" : "weighted-retaliation"
      });
    }

    // Ally involvement (staggered)
    const allies = joinAllies({
      victim: to,
      world,
      state
    });

    for (const ally of allies) {
      const target = pickWeightedTarget({
        attacker: ally,
        lastStriker: from,
        world,
        state
      });

      queue.push({
        type: "strike",
        from: ally,
        to: target,
        reason: "ally-weighted-response"
      });
    }
  }

  return state.events;
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

    let weight = 1; // baseline → minors still get hit

    // 🎯 bias toward last striker
    if (code === lastStriker) weight += 6;

    // 💥 power matters
    weight += (N.powerTier ?? 1) * 1.5;

    // 😡 bad relations matter
    const rel =
      bilateral?.[attacker]?.[code] ??
      bilateral?.[code]?.[attacker] ??
      0;

    if (rel < 0) {
      // enemies → more likely
      weight += Math.abs(rel) * 2;
    } else {
      // neutral / friendly → strongly discouraged but NOT impossible
      weight *= 0.15; // ~15% baseline chance
    }

    // 🧨 already involved = more likely
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
