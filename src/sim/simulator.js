import { createEscalationState } from "./state.js";
import { launchStrike } from "./strikes.js";
import { canLaunch } from "./weapons.js";
import { pickWeightedTarget } from "./targeting.js";
import { processGlobalDevelopment } from "./development.js";
import { computeSalvoCount } from "./salvo.js";
import { joinAllies } from "./diplomacy.js";

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

        let strikeActive = true;
        let strikesInTick = 0;
        let lastVictim = to;

        while (strikeActive && canLaunch(from, state)) {
            const count = computeSalvoCount({
                time: state.time,
                powerTier: nations[from].powerTier,
                remaining: state.remaining[from],
            });

            const decision = pickWeightedTarget({
                attacker: from,
                lastStriker: lastVictim,
                world: worldClone,
                state,
            });
            const thisTarget = decision?.code ?? lastVictim ?? to;

            const used = launchStrike({
                from,
                to: thisTarget,
                state,
                maxPerStrike: count,
                isBetrayal: decision?.isBetrayal || isBetrayal || false,
                world: worldClone,
            });

            if (!used) break;

            strikesInTick++;
            lastVictim = thisTarget;

            if (Math.random() > 0.4) {
                strikeActive = false;
            }
        }

        if (strikesInTick > 0) {
            state.time++;

            const victim = lastVictim;

            if (Math.random() < 0.35) {
                const decision = pickWeightedTarget({
                    attacker: from,
                    lastStriker: victim,
                    world: worldClone,
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

            if (canLaunch(victim, state)) {
                const decision = pickWeightedTarget({
                    attacker: victim,
                    lastStriker: from,
                    world: worldClone,
                    state,
                });
                if (decision?.code && decision.code !== victim) {
                    queue.push({
                        type: "strike",
                        from: victim,
                        to: decision.code,
                        isBetrayal: decision.isBetrayal,
                        reason: decision.isBetrayal
                            ? "betrayal-retaliation"
                            : "retaliation",
                    });
                }
            }

            const allies = joinAllies({
                victim,
                attacker: from,
                world: worldClone,
                state,
            });
            for (const ally of allies) {
                const decision = pickWeightedTarget({
                    attacker: ally,
                    lastStriker: from,
                    world: worldClone,
                    state,
                });
                if (decision?.code) {
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
            }
        }

        ticks++;
    }

    state.events.push({ t: state.time, type: "end" });
    return state.events;
}
