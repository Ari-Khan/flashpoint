import { createEscalationState } from "./escalationState";
import {
    launchStrike,
    shouldRetaliate,
    joinAllies,
    canLaunch,
    pickWeightedTarget,
} from "./escalationLogic";
import { computeSalvoCount } from "./salvoLogic";

export function simulateEscalation({
    initiator,
    firstTarget,
    world,
    maxEvents = 10000,
}) {
    const { nations } = world;
    const state = createEscalationState();

    // Init remaining nukes
    for (const k in nations) {
        state.remaining[k] = {
            icbm: nations[k].weapons.icbm,
            slbm: nations[k].weapons.slbm,
            air: nations[k].weapons.airLaunch,
        };
    }

    // Event queue
    const queue = [];

    queue.push({
        type: "strike",
        from: initiator,
        to: firstTarget,
        reason: "initial",
    });

    while (queue.length > 0) {
        if (state.events.length >= maxEvents) break;

        const event = queue.shift();
        const { from, to } = event;

        if (!canLaunch(from, state)) continue;

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
        });

        if (!used) continue;
        state.time++;

        if (Math.random() < 0.35) {
            const nextTarget = pickWeightedTarget({
                attacker: from,
                lastStriker: to,
                world,
                state,
            });

            if (nextTarget && nextTarget !== from) {
                queue.push({
                    type: "strike",
                    from,
                    to: nextTarget,
                    reason: "continued-escalation",
                });
            }
        }

        // Retaliation
        if (shouldRetaliate(nations[to])) {
            const target = pickWeightedTarget({
                attacker: to,
                lastStriker: from,
                world,
                state,
            });

            queue.push({
                type: "strike",
                from: to,
                to: target,
                reason:
                    target === from ? "retaliation" : "weighted-retaliation",
            });
        }

        // Ally involvement (staggered)
        const allies = joinAllies({
            victim: to,
            world,
            state,
        });

        for (const ally of allies) {
            const target = pickWeightedTarget({
                attacker: ally,
                lastStriker: from,
                world,
                state,
            });

            queue.push({
                type: "strike",
                from: ally,
                to: target,
                reason: "ally-weighted-response",
            });
        }
    }

    return state.events;
}
