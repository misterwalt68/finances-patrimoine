import type { AdaptateurPrix } from "./types";
import { coingecko } from "./adaptateurs/coingecko";
import { metaux } from "./adaptateurs/metaux";

/**
 * Registre d'adaptateurs — SPEC.md §2 : ajouter un actif n'exige jamais de
 * toucher au moteur ; ajouter une source, si (un adaptateur de plus ici).
 * "manuel" n'a volontairement pas d'entrée : c'est un utilisateur, pas un
 * adaptateur, qui fournit le prix (cf. rafraichir.ts).
 */
const registre: Record<string, AdaptateurPrix> = {
  coingecko,
  metaux,
};

export function obtenirAdaptateur(sourcePrix: string): AdaptateurPrix | null {
  return registre[sourcePrix] ?? null;
}
