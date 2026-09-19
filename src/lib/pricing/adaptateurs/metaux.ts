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

export type PointHistorique = { date: Date; prix: number };

/**
 * Historique quotidien de l'or, converti en €/gramme.
 *
 * Limite du palier gratuit de goldprice.dev, vérifiée en direct : seulement
 * les 30 derniers jours, et uniquement en dollars (l'historique en euros
 * n'est pas disponible gratuitement). On convertit donc chaque valeur via
 * le taux EUR/USD *du jour* (rapport entre les deux cours au comptant
 * actuels) — une approximation raisonnable pour un usage personnel, pas un
 * vrai taux historique jour par jour.
 */
export async function obtenirHistoriqueOr(depuis: Date): Promise<PointHistorique[]> {
  const [prixEur, prixUsd] = await Promise.all([
    metaux.obtenirPrix("XAU", "EUR"),
    metaux.obtenirPrix("XAU", "USD"),
  ]);
  const tauxEurParUsd = prixEur.prix / prixUsd.prix;

  const depuisStr = depuis.toISOString().slice(0, 10);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const url = `https://api.goldprice.dev/v1/bars?symbol=XAU-USD-SPOT&interval=1d&from=${depuisStr}&to=${aujourdHui}&limit=60`;
  const reponse = await fetch(url, { cache: "no-store" });

  if (!reponse.ok) {
    throw new Error(`goldprice.dev (historique) a répondu ${reponse.status}`);
  }

  const donnees = await reponse.json();
  const barres: { bar_start: string; close: string }[] = donnees?.bars ?? [];

  return barres
    .map((b) => ({
      date: new Date(b.bar_start),
      prix: (Number(b.close) * tauxEurParUsd) / GRAMMES_PAR_ONCE_TROY,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
