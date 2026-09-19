"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demarrerAutorisation, EB_SANDBOX } from "@/lib/enable-banking/client";

const NOM_COOKIE_STATE = "eb_state";

/**
 * Banque ciblée par le bouton de connexion : la vraie BoursoBank en
 * production, la banque de test "Mock ASPSP" en dev (EB_SANDBOX) — jamais
 * de vraies données touchées pendant le développement.
 */
const ASPSP_CIBLE = EB_SANDBOX ? { nom: "Mock ASPSP", pays: "AT" } : { nom: "Boursorama Banque", pays: "FR" };

/**
 * Démarre le consentement DSP2 : redirige vers la page où l'utilisateur
 * s'authentifie directement chez sa banque (jamais chez nous). Le `state`
 * est stocké dans un cookie httpOnly le temps de l'aller-retour, pour
 * vérifier au retour que la réponse correspond bien à cette tentative
 * (protection CSRF standard du flux d'autorisation).
 */
export async function connecterBanque() {
  const state = randomUUID();

  const cookieStore = await cookies();
  cookieStore.set(NOM_COOKIE_STATE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const { url } = await demarrerAutorisation({
    redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/enable-banking/callback`,
    state,
    sandbox: EB_SANDBOX,
    aspspNom: ASPSP_CIBLE.nom,
    aspspPays: ASPSP_CIBLE.pays,
  });

  redirect(url);
}
