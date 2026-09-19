import { creerJwtCoinbase } from "./jwt";

const URL_BASE = "https://api.coinbase.com";

function identifiants() {
  const nomCle = process.env.COINBASE_CDP_KEY_NAME;
  const clePriveePem = process.env.COINBASE_CDP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!nomCle || !clePriveePem) {
    throw new Error(
      "Coinbase non configuré : COINBASE_CDP_KEY_NAME / COINBASE_CDP_PRIVATE_KEY manquants",
    );
  }
  return { nomCle, clePriveePem };
}

async function requeteCoinbase<T>(chemin: string): Promise<T> {
  const { nomCle, clePriveePem } = identifiants();
  // Le JWT signe le chemin SANS les paramètres de requête (?limit=...) —
  // Coinbase renvoie 401 si la revendication "uri" inclut la query string.
  const cheminPourJwt = chemin.split("?")[0];
  const jwt = creerJwtCoinbase({ nomCle, clePriveePem, methode: "GET", chemin: cheminPourJwt });

  const reponse = await fetch(`${URL_BASE}${chemin}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });

  if (!reponse.ok) {
    const corps = await reponse.text();
    throw new Error(`Coinbase a répondu ${reponse.status} : ${corps}`);
  }

  return reponse.json() as Promise<T>;
}

type CompteCoinbaseBrut = {
  id: string;
  name: string;
  balance: { amount: string; currency: string };
};

type ReponseComptesCoinbase = {
  data: CompteCoinbaseBrut[];
  pagination: { next_starting_after: string | null };
};

export type SoldeCoinbase = {
  devise: string;
  quantite: number;
  nomCompte: string;
  /** Détecté sur le nom du compte Coinbase (ex. "ETH staké") — pas de champ dédié côté API. */
  stake: boolean;
  /** Comptes Coinbase bruts fusionnés dans ce solde (même devise + même statut de stake) — sert à aller chercher l'historique des transactions de chacun pour calculer le vrai prix de revient. */
  comptesIds: string[];
};

/**
 * Soldes non nuls, lecture seule — SPEC.md §5.4 : jamais de trading/retrait.
 *
 * Utilise l'API v2 (`/v2/accounts`, l'API "app" historique) et non l'API v3
 * Advanced Trade (`/api/v3/brokerage/accounts`) : cette dernière ne liste que
 * les portefeuilles négociables et **omet les wallets de staking**. Un actif
 * staké via l'app Coinbase apparaît comme un compte v2 à part entière (ex.
 * "ETH staké"), détecté ici sur son nom faute de champ dédié dans l'API.
 * Les quantités sont additionnées par devise ET par statut de staking (deux
 * comptes "ADA" côté Coinbase, l'un liquide l'autre staké, donnent deux
 * entrées ici — jamais fusionnées entre elles).
 */
export async function obtenirSoldesCoinbase(): Promise<SoldeCoinbase[]> {
  const parCle = new Map<string, SoldeCoinbase>();
  let curseur: string | undefined;

  do {
    const chemin = curseur
      ? `/v2/accounts?limit=100&starting_after=${encodeURIComponent(curseur)}`
      : "/v2/accounts?limit=100";
    const donnees = await requeteCoinbase<ReponseComptesCoinbase>(chemin);

    for (const compte of donnees.data) {
      const quantite = Number(compte.balance.amount);
      if (quantite <= 0) continue;

      const devise = compte.balance.currency;
      const stake = /stak/i.test(compte.name);
      const cle = `${devise}:${stake}`;

      const existant = parCle.get(cle);
      if (existant) {
        existant.quantite += quantite;
        existant.comptesIds.push(compte.id);
      } else {
        parCle.set(cle, { devise, quantite, nomCompte: compte.name, stake, comptesIds: [compte.id] });
      }
    }

    curseur = donnees.pagination?.next_starting_after ?? undefined;
  } while (curseur);

  return [...parCle.values()];
}

export type TransactionCoinbase = {
  type: string;
  /** Quantité de la devise du compte — positive si acquise, négative si sortie. */
  montant: number;
  /** Valeur en euros au moment de la transaction (signe aligné sur `montant`). */
  montantNatifEur: number;
  date: Date;
};

type TransactionCoinbaseBrute = {
  type: string;
  amount: { amount: string };
  native_amount: { amount: string; currency: string };
  created_at: string;
};

type ReponseTransactionsCoinbase = {
  data: TransactionCoinbaseBrute[];
  pagination: { next_starting_after: string | null };
};

/**
 * Historique complet des mouvements d'un compte Coinbase (achats, ventes,
 * conversions, envois/réceptions, récompenses de staking...) — sert à
 * calculer le vrai prix de revient moyen (SPEC.md §7), Coinbase ne l'expose
 * pas directement sur `/v2/accounts`.
 */
export async function obtenirTransactionsCoinbase(compteId: string): Promise<TransactionCoinbase[]> {
  const transactions: TransactionCoinbase[] = [];
  let curseur: string | undefined;

  do {
    const chemin = curseur
      ? `/v2/accounts/${compteId}/transactions?limit=100&starting_after=${encodeURIComponent(curseur)}`
      : `/v2/accounts/${compteId}/transactions?limit=100`;
    const donnees = await requeteCoinbase<ReponseTransactionsCoinbase>(chemin);

    for (const t of donnees.data) {
      transactions.push({
        type: t.type,
        montant: Number(t.amount.amount),
        montantNatifEur: Number(t.native_amount.amount),
        date: new Date(t.created_at),
      });
    }

    curseur = donnees.pagination?.next_starting_after ?? undefined;
  } while (curseur);

  return transactions;
}
