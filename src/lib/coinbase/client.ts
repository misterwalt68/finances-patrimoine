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
  const jwt = creerJwtCoinbase({ nomCle, clePriveePem, methode: "GET", chemin });

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
  uuid: string;
  name: string;
  currency: string;
  available_balance: { value: string; currency: string };
  active: boolean;
};

type ReponseComptesCoinbase = {
  accounts: CompteCoinbaseBrut[];
  has_next: boolean;
  cursor: string;
};

export type SoldeCoinbase = {
  devise: string;
  quantite: number;
  nomCompte: string;
};

/** Soldes non nuls, lecture seule — SPEC.md §5.4 : jamais de trading/retrait. */
export async function obtenirSoldesCoinbase(): Promise<SoldeCoinbase[]> {
  const soldes: SoldeCoinbase[] = [];
  let curseur: string | undefined;

  do {
    const chemin = curseur
      ? `/api/v3/brokerage/accounts?cursor=${encodeURIComponent(curseur)}`
      : "/api/v3/brokerage/accounts";
    const donnees = await requeteCoinbase<ReponseComptesCoinbase>(chemin);

    for (const compte of donnees.accounts) {
      const quantite = Number(compte.available_balance.value);
      if (quantite > 0) {
        soldes.push({
          devise: compte.available_balance.currency,
          quantite,
          nomCompte: compte.name,
        });
      }
    }

    curseur = donnees.has_next ? donnees.cursor : undefined;
  } while (curseur);

  return soldes;
}
