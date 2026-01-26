import { createEscalationState } from "./escalationState.js";
import {
    launchStrike,
    joinAllies,
    canLaunch,
    pickWeightedTarget,
    processGlobalDevelopment,
} from "./escalationLogic.js";
import { computeSalvoCount } from "./salvoLogic.js";

export function simulateEscalation({
    initiator,
    firstTarget,
    world,
    maxEvents = 10000,
    maxTime = 1000,
}) {
    const worldClone = JSON.parse(JSON.stringify(world));
    const { nations } = worldClone;
    const state = createEscalationState();

    for (const k in nations) {
        state.remaining[k] = {
            icbm: nations[k].weapons.icbm,
            slbm: nations[k].weapons.slbm,
            air: nations[k].weapons.airLaunch,
        };
        const totalStart =
            state.remaining[k].icbm +
            state.remaining[k].slbm +
            state.remaining[k].air;
        state.devProgress[k] = totalStart > 0 ? -1 : 0;
    }

    const queue = [];
    queue.push({
        type: "strike",
        from: initiator,
        to: firstTarget,
        reason: "initial",
    });

    let ticks = 0;
    while (ticks < maxTime && state.events.length < maxEvents) {
        const breakouts = processGlobalDevelopment(state, worldClone);
        for (const code of breakouts) {
            state.events.push({
                t: state.time,
                type: "breakout",
                country: code,
            });
        }
        if (queue.length === 0) {
            state.time++;
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
            state,
            maxPerStrike: count,
            isBetrayal: isBetrayal || false,
            world,
        });
        if (!used) {
            ticks++;
            continue;
        }
        state.time++;
        if (Math.random() < 0.35) {
            const decision = pickWeightedTarget({
                attacker: from,
                lastStriker: to,
                world,
                state,
            });
            if (decision?.code && decision.code !== from) {
                queue.push({
                    type: "strike",
                    from,
                    to: decision.code,
                    isBetrayal: decision.isBetrayal,
                    reason: decision.isBetrayal
                        ? "betrayal"
                        : "continued-escalation",
                });
            }
        }

        if (canLaunch(to, state)) {
            const decision = pickWeightedTarget({
                attacker: to,
                lastStriker: from,
                world,
                state,
            });
            if (decision?.code && decision.code !== to) {
                queue.push({
                    type: "strike",
                    from: to,
                    to: decision.code,
                    isBetrayal: decision.isBetrayal,
                    reason: decision.isBetrayal
                        ? "betrayal-retaliation"
                        : "retaliation",
                });
            }
        }
        const allies = joinAllies({ victim: to, attacker: from, world, state });
        for (const ally of allies) {
            const decision = pickWeightedTarget({
                attacker: ally,
                lastStriker: from,
                world,
                state,
            });
            queue.push({
                type: "strike",
                from: ally,
                to: decision.code,
                isBetrayal: decision.isBetrayal,
                reason: decision.isBetrayal
                    ? "betrayal-ally"
                    : "ally-weighted-response",
            });
        }

        ticks++;
    }

    state.events.push({ t: state.time, type: "end" });
    return state.events;
}
