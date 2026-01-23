import { createEscalationState } from "./escalationState";
import {
    launchStrike,
    shouldRetaliate,
    joinAllies,
    canLaunch,
    pickWeightedTarget,
    processGlobalDevelopment
} from "./escalationLogic";
import { computeSalvoCount } from "./salvoLogic";

export function simulateEscalation({ initiator, firstTarget, world, maxEvents = 10000, maxTime = 500 }) {
    const worldClone = JSON.parse(JSON.stringify(world));
    const { nations } = worldClone;
    const state = createEscalationState();

    for (const k in nations) {
        state.remaining[k] = {
            icbm: nations[k].weapons.icbm,
            slbm: nations[k].weapons.slbm,
            air: nations[k].weapons.airLaunch,
        };
        const totalStart = nations[k].weapons.icbm + nations[k].weapons.slbm + nations[k].weapons.airLaunch;
        state.devProgress[k] = totalStart > 0 ? -1 : 0;
    }

    const queue = [];
    queue.push({ type: "strike", from: initiator, to: firstTarget, reason: "initial" });

    let ticks = 0;
    const maxTicks = 500; // or any other upper bound you want
    while (ticks < maxTicks && state.events.length < maxEvents) {
        if (queue.length === 0) {
            // No events, but keep ticking
            state.time++;
            state.events.push({ t: state.time, type: "empty" });
            ticks++;
            continue;
        }

        const event = queue.shift();
        
        if (!event) {
            state.time++;
            continue;
        }

        const { from, to, isBetrayal } = event;

        if (!canLaunch(from, state)) {
            ticks++;
            continue;
        }

        const count = computeSalvoCount({
            time: state.time,
            powerTier: nations[from].powerTier,
            remaining: state.remaining[from],
        });

        const used = launchStrike({
            from,
            to,
            nations,
            state,
            maxPerStrike: count,
            isBetrayal: isBetrayal || false
        });

        if (!used) {
            ticks++;
            continue;
        }
        state.time++;

        if (Math.random() < 0.35) {
            const decision = pickWeightedTarget({ attacker: from, lastStriker: to, world, state });
            if (decision?.code && decision.code !== from) {
                queue.push({
                    type: "strike",
                    from,
                    to: decision.code,
                    isBetrayal: decision.isBetrayal,
                    reason: decision.isBetrayal ? "betrayal" : "continued-escalation",
                });
            }
        }

        if (shouldRetaliate(nations[to])) {
            const decision = pickWeightedTarget({ attacker: to, lastStriker: from, world, state });
            if (decision?.code && decision.code !== to) {
                queue.push({
                    type: "strike",
                    from: to,
                    to: decision.code,
                    isBetrayal: decision.isBetrayal,
                    reason: decision.isBetrayal ? "betrayal-retaliation" : "retaliation",
                });
            }
        }

        const allies = joinAllies({ victim: to, attacker: from, world, state }); 
        for (const ally of allies) {
            const decision = pickWeightedTarget({ attacker: ally, lastStriker: from, world, state });
            queue.push({
                type: "strike",
                from: ally,
                to: decision.code,
                isBetrayal: decision.isBetrayal,
                reason: decision.isBetrayal ? "betrayal-ally" : "ally-weighted-response",
            });
        }
        ticks++;
    }

    state.events.push({ t: state.time, type: "end" });
    return state.events;
}