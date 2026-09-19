"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demarrerAutorisation, EB_SANDBOX } from "@/lib/enable-banking/client";
import { ASPSP_PAR_BANQUE, type CleBanque } from "./banques";

const NOM_COOKIE_STATE = "eb_state";

/**
 * Démarre le consentement DSP2 : redirige vers la page où l'utilisateur
 * s'authentifie directement chez sa banque (jamais chez nous). Le `state`
 * est stocké dans un cookie httpOnly le temps de l'aller-retour, pour
 * vérifier au retour que la réponse correspond bien à cette tentative
 * (protection CSRF standard du flux d'autorisation).
 */
export async function connecterBanque(formData: FormData) {
  const banque = formData.get("banque");
  if (typeof banque !== "string" || !(banque in ASPSP_PAR_BANQUE)) {
    throw new Error("Banque inconnue");
  }

  const state = randomUUID();

  const cookieStore = await cookies();
  cookieStore.set(NOM_COOKIE_STATE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const cible = EB_SANDBOX ? { nom: "Mock ASPSP", pays: "AT" } : ASPSP_PAR_BANQUE[banque as CleBanque];

  const { url } = await demarrerAutorisation({
    redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/enable-banking/callback`,
    state,
    sandbox: EB_SANDBOX,
    aspspNom: cible.nom,
    aspspPays: cible.pays,
  });

  redirect(url);
}
