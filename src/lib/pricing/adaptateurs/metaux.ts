import type { AdaptateurPrix } from "../types";

const GRAMMES_PAR_ONCE_TROY = 31.1034768;
const GRAMMES_PAR_LIVRE = 453.59237;

type ConfigYahoo = { ticker: string; grammesParUnite: number };

/**
 * Tickers de contrats à terme Yahoo Finance (COMEX/NYMEX) par métal —
 * vérifiés en direct par `curl` : tous cotés en USD par once troy, sauf le
 * cuivre coté par livre (lb), d'où la conversion différente.
 */
const CONFIG_YAHOO: Record<string, ConfigYahoo> = {
  XAU: { ticker: "GC=F", grammesParUnite: GRAMMES_PAR_ONCE_TROY },
  XAG: { ticker: "SI=F", grammesParUnite: GRAMMES_PAR_ONCE_TROY },
  XPT: { ticker: "PL=F", grammesParUnite: GRAMMES_PAR_ONCE_TROY },
  XPD: { ticker: "PA=F", grammesParUnite: GRAMMES_PAR_ONCE_TROY },
  XCU: { ticker: "HG=F", grammesParUnite: GRAMMES_PAR_LIVRE },
};

async function obtenirPrixSpotOr(devise: string): Promise<number> {
  const url = `https://api.goldprice.dev/v1/prices?symbol=XAU-${devise}-SPOT`;
  const reponse = await fetch(url, { cache: "no-store" });
  if (!reponse.ok) throw new Error(`goldprice.dev a répondu ${reponse.status}`);

  const donnees = await reponse.json();
  const prix = Number(donnees?.symbols?.[0]?.price);
  if (!Number.isFinite(prix)) {
    throw new Error(`goldprice.dev : prix introuvable pour XAU-${devise}`);
  }
  return prix;
}

// Mémoïsation courte (30s) du taux EUR/USD du jour — évite de renvoyer une
// rafale de requêtes à goldprice.dev quand plusieurs métaux (argent, platine,
// palladium, cuivre) en ont besoin en même temps lors d'un "Actualiser".
let coursOrCache: { eur: number; usd: number; horodatage: number } | null = null;

async function tauxEurParUsd(): Promise<number> {
  const maintenant = Date.now();
  if (!coursOrCache || maintenant - coursOrCache.horodatage > 30_000) {
    const [eur, usd] = await Promise.all([obtenirPrixSpotOr("EUR"), obtenirPrixSpotOr("USD")]);
    coursOrCache = { eur, usd, horodatage: maintenant };
  }
  return coursOrCache.eur / coursOrCache.usd;
}

async function recupererGraphiqueYahoo(ticker: string, range: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=1d`;
  const reponse = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  if (!reponse.ok) {
    throw new Error(`Yahoo Finance a répondu ${reponse.status} pour ${ticker}`);
  }
  const donnees = await reponse.json();
  const resultat = donnees?.chart?.result?.[0];
  if (!resultat) throw new Error(`Yahoo Finance : aucune donnée pour ${ticker}`);
  return resultat;
}

/**
 * Cours au comptant (spot) et historique des métaux physiques.
 *
 * L'or utilise goldprice.dev (gratuit, sans clé, cours au comptant réel —
 * vérifié en direct dès le début du projet). Les quatre autres métaux sont
 * réservés au palier payant de goldprice.dev (`{"error":"plan_gated"}`,
 * vérifié en direct) : ils utilisent à la place les contrats à terme de
 * Yahoo Finance (endpoint non documenté officiellement, déjà utilisé pour
 * l'historique de l'or — cf. `obtenirHistoriqueMetal` plus bas), convertis
 * en euros via le taux EUR/USD du jour dérivé du cours de l'or (même
 * approximation que pour l'historique : pas un vrai taux temps réel dédié).
 */
export const metaux: AdaptateurPrix = {
  async obtenirPrix(identifiantSource, devise) {
    if (identifiantSource === "XAU") {
      const prixParOnce = await obtenirPrixSpotOr(devise.toUpperCase());
      return { prix: prixParOnce / GRAMMES_PAR_ONCE_TROY, devise, horodatage: new Date() };
    }

    const config = CONFIG_YAHOO[identifiantSource];
    if (!config) {
      throw new Error(`Aucune source de prix pour le métal "${identifiantSource}"`);
    }

    const resultat = await recupererGraphiqueYahoo(config.ticker, "1d");
    const prixUsd = Number(resultat?.meta?.regularMarketPrice);
    if (!Number.isFinite(prixUsd)) {
      throw new Error(`Yahoo Finance : prix introuvable pour ${config.ticker}`);
    }

    const taux = devise.toUpperCase() === "USD" ? 1 : await tauxEurParUsd();
    return { prix: (prixUsd * taux) / config.grammesParUnite, devise, horodatage: new Date() };
  },
};

export type PointHistorique = { date: Date; prix: number };

/**
 * Plages Yahoo Finance disponibles, de la plus courte à la plus longue —
 * sert à ne demander que ce qu'il faut pour couvrir les jours manquants
 * depuis le dernier point déjà en base, plutôt que retélécharger 25 ans à
 * chaque appel. Toutes vérifiées en direct par `curl` (nombre de points
 * cohérent avec une résolution quotidienne réelle).
 */
const PLAGES_YAHOO: { jours: number; range: string }[] = [
  { jours: 5, range: "5d" },
  { jours: 30, range: "1mo" },
  { jours: 90, range: "3mo" },
  { jours: 180, range: "6mo" },
  { jours: 365, range: "1y" },
  { jours: 365 * 2, range: "2y" },
  { jours: 365 * 5, range: "5y" },
  { jours: 365 * 10, range: "10y" },
];

function choisirPlageYahoo(depuis: Date | undefined): string {
  if (!depuis) return "25y"; // jamais chargé : il faut tout l'historique.
  const joursEcoules = (Date.now() - depuis.getTime()) / (1000 * 60 * 60 * 24);
  const plage = PLAGES_YAHOO.find((p) => joursEcoules <= p.jours);
  return plage?.range ?? "25y";
}

/**
 * Historique quotidien d'un métal physique, converti en €/gramme — complet
 * (25 ans) si `depuis` est omis, sinon uniquement les points postérieurs à
 * cette date (rechargement incrémental : demandé par Maxime pour éviter de
 * retélécharger 25 ans de cotations à chaque clic sur "Actualiser les
 * cours").
 *
 * Piège vérifié en direct (curl) : `range=max` renvoie silencieusement un
 * point par MOIS au lieu d'un point par jour (Yahoo dégrade la résolution
 * au-delà d'un certain historique) — `range=25y` renvoie bien un point par
 * jour de bourse sur toute la période (~6300 points vérifiés pour chacun
 * des 5 métaux), largement suffisant pour cet usage personnel.
 */
export async function obtenirHistoriqueMetal(symbole: string, depuis?: Date): Promise<PointHistorique[]> {
  const config = CONFIG_YAHOO[symbole];
  if (!config) return [];

  const [taux, resultat] = await Promise.all([
    tauxEurParUsd(),
    recupererGraphiqueYahoo(config.ticker, choisirPlageYahoo(depuis)),
  ]);

  const timestamps: number[] = resultat?.timestamp ?? [];
  const closes: (number | null)[] = resultat?.indicators?.quote?.[0]?.close ?? [];

  const points: PointHistorique[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const closeUsd = closes[i];
    if (closeUsd == null) continue; // jour sans cotation (marché fermé)
    const date = new Date(timestamps[i] * 1000);
    if (depuis && date.getTime() <= depuis.getTime()) continue; // déjà en base
    points.push({ date, prix: (closeUsd * taux) / config.grammesParUnite });
  }

  return points.sort((a, b) => a.date.getTime() - b.date.getTime());
}
