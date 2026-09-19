import type { AdaptateurPrix } from "../types";

const GRAMMES_PAR_ONCE_TROY = 31.1034768;

/**
 * goldprice.dev — gratuit, sans clé API. Vérifié en direct (curl) avant
 * intégration : renvoie le cours au comptant en once troy, converti ici en
 * grammes (SPEC.md §5.2 : "cours de l'or en euros par gramme").
 */
export const metaux: AdaptateurPrix = {
  async obtenirPrix(identifiantSource, devise) {
    const url = `https://api.goldprice.dev/v1/prices?symbol=${identifiantSource}-${devise.toUpperCase()}-SPOT`;
    const reponse = await fetch(url, { cache: "no-store" });

    if (!reponse.ok) {
      throw new Error(`goldprice.dev a répondu ${reponse.status}`);
    }

    const donnees = await reponse.json();
    const prixParOnce = Number(donnees?.symbols?.[0]?.price);

    if (!Number.isFinite(prixParOnce)) {
      throw new Error(
        `goldprice.dev : symbole "${identifiantSource}" ou devise "${devise}" introuvable`,
      );
    }

    return {
      prix: prixParOnce / GRAMMES_PAR_ONCE_TROY,
      devise,
      horodatage: new Date(),
    };
  },
};
