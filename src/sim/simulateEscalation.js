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
      queue.push({
        type: "strike",
        from: to,
        to: from,
        reason: "retaliation"
      });
    }

    // Ally involvement (staggered)
    const allies = joinAllies({
      victim: to,
      world,
      state
    });

    for (const ally of allies) {
      queue.push({
        type: "strike",
        from: ally,
        to: from,
        reason: "ally-response"
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