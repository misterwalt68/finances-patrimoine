import type { AdaptateurPrix } from "../types";
import { obtenirSoldesBancaires, EB_SANDBOX } from "@/lib/enable-banking/client";

/**
 * Un compte bancaire (DSP2) est modélisé comme une position d'une seule
 * unité dont le "cours" est le solde lui-même (SPEC §4 : la quantité est la
 * vérité, la valeur est toujours calculée — ici quantité = 1, cours = solde).
 * `identifiantSource` est l'uid de compte Enable Banking.
 */
export const enableBanking: AdaptateurPrix = {
  async obtenirPrix(identifiantSource) {
    const soldes = await obtenirSoldesBancaires(identifiantSource, EB_SANDBOX);
    // Le solde comptable (CLBD, "closing booked") fait foi ; à défaut, le
    // premier solde renvoyé par la banque.
    const solde = soldes.find((s) => s.type === "CLBD") ?? soldes[0];
    if (!solde) {
      throw new Error(`Enable Banking : aucun solde pour le compte ${identifiantSource}`);
    }
    return { prix: solde.montant, devise: solde.devise, horodatage: new Date() };
  },
};
