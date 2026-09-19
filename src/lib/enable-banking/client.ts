import { creerJwtEnableBanking } from "./jwt";

const URL_BASE = "https://api.enablebanking.com";

/**
 * Deux applications Enable Banking distinctes (cf. CONNEXIONS.md) :
 * - Production restreinte (comptes réels de Maxime) — utilisée en prod.
 * - Sandbox (banque de test "Mock ASPSP") — utilisée en dev, pour vérifier
 *   tout le mécanisme sans jamais toucher au vrai compte BoursoBank.
 * Le choix se fait sur `NODE_ENV`, comme le court-circuit d'auth de
 * `src/proxy.ts` — jamais "development" sur un vrai déploiement Vercel.
 */
export const EB_SANDBOX = process.env.NODE_ENV === "development";

function identifiants(sandbox: boolean) {
  const applicationId = sandbox
    ? process.env.ENABLE_BANKING_SANDBOX_APPLICATION_ID
    : process.env.ENABLE_BANKING_APPLICATION_ID;
  const clePriveePem = (
    sandbox ? process.env.ENABLE_BANKING_SANDBOX_PRIVATE_KEY : process.env.ENABLE_BANKING_PRIVATE_KEY
  )?.replace(/\\n/g, "\n");

  if (!applicationId || !clePriveePem) {
    throw new Error(
      `Enable Banking non configuré (${sandbox ? "sandbox" : "production"}) : identifiants manquants`,
    );
  }
  return { applicationId, clePriveePem };
}

async function requeteEnableBanking<T>(
  chemin: string,
  options: { methode?: string; corps?: unknown; sandbox: boolean },
): Promise<T> {
  const { applicationId, clePriveePem } = identifiants(options.sandbox);
  const jwt = creerJwtEnableBanking({ applicationId, clePrivee: clePriveePem });

  const reponse = await fetch(`${URL_BASE}${chemin}`, {
    method: options.methode ?? "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: options.corps ? JSON.stringify(options.corps) : undefined,
    cache: "no-store",
  });

  if (!reponse.ok) {
    const corps = await reponse.text();
    throw new Error(`Enable Banking a répondu ${reponse.status} sur ${chemin} : ${corps}`);
  }

  return reponse.json() as Promise<T>;
}

/**
 * Démarre le consentement DSP2 — renvoie l'URL vers laquelle rediriger
 * l'utilisateur pour qu'il s'authentifie directement chez sa banque
 * (Enable Banking ne voit ni ne stocke jamais ses identifiants bancaires).
 */
export async function demarrerAutorisation(params: {
  redirectUrl: string;
  state: string;
  sandbox: boolean;
  aspspNom: string;
  aspspPays: string;
}): Promise<{ url: string }> {
  return requeteEnableBanking("/auth", {
    methode: "POST",
    sandbox: params.sandbox,
    corps: {
      // 90 jours : durée de consentement DSP2 standard (SPEC.md §5.1).
      access: { valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() },
      aspsp: { name: params.aspspNom, country: params.aspspPays },
      state: params.state,
      redirect_url: params.redirectUrl,
      psu_type: "personal",
    },
  });
}

export type CompteBancaireExterne = {
  uid: string;
  nom: string | null;
  iban: string | null;
  devise: string | null;
};

export type SessionEnableBanking = {
  sessionId: string;
  aspspNom: string;
  aspspPays: string;
  validJusqua: string;
  comptes: CompteBancaireExterne[];
};

/** Échange le `code` reçu au retour du consentement contre une session. */
export async function creerSession(params: { code: string; sandbox: boolean }): Promise<SessionEnableBanking> {
  type ReponseBrute = {
    session_id: string;
    aspsp: { name: string; country: string };
    access: { valid_until: string };
    accounts: {
      uid: string;
      name?: string;
      account_id?: { iban?: string };
      currency?: string;
    }[];
  };

  const brut = await requeteEnableBanking<ReponseBrute>("/sessions", {
    methode: "POST",
    sandbox: params.sandbox,
    corps: { code: params.code },
  });

  return {
    sessionId: brut.session_id,
    aspspNom: brut.aspsp.name,
    aspspPays: brut.aspsp.country,
    validJusqua: brut.access.valid_until,
    comptes: brut.accounts.map((c) => ({
      uid: c.uid,
      nom: c.name ?? null,
      iban: c.account_id?.iban ?? null,
      devise: c.currency ?? null,
    })),
  };
}

export type SoldeBancaire = { libelle: string | null; montant: number; devise: string; type: string | null };

export async function obtenirSoldesBancaires(compteUid: string, sandbox: boolean): Promise<SoldeBancaire[]> {
  type ReponseBrute = {
    balances: { name?: string; balance_amount: { amount: string; currency: string }; balance_type?: string }[];
  };
  const brut = await requeteEnableBanking<ReponseBrute>(`/accounts/${compteUid}/balances`, { sandbox });
  return brut.balances.map((b) => ({
    libelle: b.name ?? null,
    montant: Number(b.balance_amount.amount),
    devise: b.balance_amount.currency,
    type: b.balance_type ?? null,
  }));
}

export type TransactionBancaire = {
  id: string | null;
  date: string | null;
  montant: number;
  devise: string;
  libelle: string | null;
};

export async function obtenirTransactionsBancaires(
  compteUid: string,
  sandbox: boolean,
  continuationKey?: string,
): Promise<{ transactions: TransactionBancaire[]; continuationKey: string | null }> {
  type ReponseBrute = {
    transactions: {
      transaction_id?: string;
      booking_date?: string;
      transaction_date?: string;
      transaction_amount: { amount: string; currency: string };
      remittance_information?: string[];
      creditor?: { name?: string };
      debtor?: { name?: string };
    }[];
    continuation_key?: string;
  };

  const chemin = continuationKey
    ? `/accounts/${compteUid}/transactions?continuation_key=${encodeURIComponent(continuationKey)}`
    : `/accounts/${compteUid}/transactions`;

  const brut = await requeteEnableBanking<ReponseBrute>(chemin, { sandbox });

  return {
    transactions: brut.transactions.map((t) => ({
      id: t.transaction_id ?? null,
      date: t.booking_date ?? t.transaction_date ?? null,
      montant: Number(t.transaction_amount.amount),
      devise: t.transaction_amount.currency,
      libelle: t.remittance_information?.join(" ") ?? t.creditor?.name ?? t.debtor?.name ?? null,
    })),
    continuationKey: brut.continuation_key ?? null,
  };
}
