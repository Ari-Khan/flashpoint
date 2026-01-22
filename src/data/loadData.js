import nations from "./nations.json";
import factions from "./factions.json";
import bilateral from "./bilateral-relations.json";
import factionRelations from "./faction-relations.json";

export function loadWorld() {
  return {
    nations,
    factions,
    bilateral,
    factionRelations
  };
}
