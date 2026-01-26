import nations from "../data/nations.json";
import factions from "../data/factions.json";
import bilateral from "../data/bilateral-relations.json";

export function loadWorld() {
    return {
        nations,
        factions,
        bilateral,
    };
}
