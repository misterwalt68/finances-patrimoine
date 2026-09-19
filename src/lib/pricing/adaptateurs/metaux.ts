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
 * Historique quotidien de l'or (25+ ans), converti en €/gramme.
 *
 * goldprice.dev (utilisé pour le cours du jour ci-dessus) limite son
 * historique gratuit à 30 jours — vérifié en direct. Pour un vrai historique
 * long terme, on utilise l'endpoint "chart" de Yahoo Finance sur le contrat
 * à terme sur l'or (GC=F, COMEX) : gratuit, sans clé, aucune limite de
 * période rencontrée en pratique (testé jusqu'à "max", ~2000 à aujourd'hui).
 * C'est un endpoint non documenté officiellement par Yahoo — largement
 * utilisé par l'écosystème finance open source depuis des années, mais sans
 * garantie contractuelle de leur part ; à surveiller s'il venait à changer.
 *
 * Coté en dollars par once troy (comme tout contrat COMEX) : converti en
 * euros via le taux EUR/USD *du jour* (rapport entre les deux cours au
 * comptant actuels de l'or), pas un vrai taux de change historique jour par
 * jour — une approximation raisonnable pour un usage personnel.
 */
export async function obtenirHistoriqueOr(): Promise<PointHistorique[]> {
  const [prixEur, prixUsd] = await Promise.all([
    metaux.obtenirPrix("XAU", "EUR"),
    metaux.obtenirPrix("XAU", "USD"),
  ]);
  const tauxEurParUsd = prixEur.prix / prixUsd.prix;

  const url = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=max&interval=1d";
  const reponse = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });

  if (!reponse.ok) {
    throw new Error(`Yahoo Finance a répondu ${reponse.status}`);
  }

  const donnees = await reponse.json();
  const resultat = donnees?.chart?.result?.[0];
  const timestamps: number[] = resultat?.timestamp ?? [];
  const closes: (number | null)[] = resultat?.indicators?.quote?.[0]?.close ?? [];

  const points: PointHistorique[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const closeUsd = closes[i];
    if (closeUsd == null) continue; // jour sans cotation (marché fermé)
    points.push({
      date: new Date(timestamps[i] * 1000),
      prix: (closeUsd * tauxEurParUsd) / GRAMMES_PAR_ONCE_TROY,
    });
  }

  return points.sort((a, b) => a.date.getTime() - b.date.getTime());
}
