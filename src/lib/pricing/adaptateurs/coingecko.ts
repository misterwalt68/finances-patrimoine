import type { AdaptateurPrix } from "../types";

async function requeteAvecBackoff(url: string, tentatives = 3): Promise<Response> {
  let derniereErreur: unknown;
  for (let i = 0; i < tentatives; i++) {
    try {
      const reponse = await fetch(url, { cache: "no-store" });
      if (reponse.ok) return reponse;
      derniereErreur = new Error(`CoinGecko a répondu ${reponse.status}`);
    } catch (e) {
      derniereErreur = e;
    }
    if (i < tentatives - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** i));
    }
  }
  throw derniereErreur;
}

/** Source gratuite, sans clé API — SPEC.md §5.2. */
export const coingecko: AdaptateurPrix = {
  async obtenirPrix(identifiantSource, devise) {
    const vsDevise = devise.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(identifiantSource)}&vs_currencies=${vsDevise}`;
    const reponse = await requeteAvecBackoff(url);
    const donnees = await reponse.json();
    const prix = donnees?.[identifiantSource]?.[vsDevise];

    if (typeof prix !== "number") {
      throw new Error(
        `CoinGecko : identifiant "${identifiantSource}" ou devise "${devise}" introuvable`,
      );
    }

    return { prix, devise, horodatage: new Date() };
  },
};

export type CoinGeckoTrouve = { identifiantSource: string; nom: string };

/**
 * Retrouve l'identifiant CoinGecko d'un actif à partir de son symbole
 * (ex. "GALA" → "gala"), pour créer automatiquement un actif inconnu lors
 * d'une synchronisation (Coinbase). Prend le premier résultat exact sur le
 * symbole — heuristique suffisante pour un usage personnel.
 */
export async function rechercherSurCoinGecko(symbole: string): Promise<CoinGeckoTrouve | null> {
  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbole)}`;
  const reponse = await requeteAvecBackoff(url);
  const donnees = await reponse.json();
  const trouve = (donnees?.coins ?? []).find(
    (c: { symbol?: string }) => c.symbol?.toUpperCase() === symbole.toUpperCase(),
  );
  if (!trouve) return null;
  return { identifiantSource: trouve.id, nom: trouve.name };
}
