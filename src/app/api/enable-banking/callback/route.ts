import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { institutions } from "@/db/schema";
import { creerSession, EB_SANDBOX } from "@/lib/enable-banking/client";

const NOM_COOKIE_STATE = "eb_state";

/**
 * Retour du consentement DSP2 (SPEC.md §5.1) : Enable Banking redirige ici
 * avec un `code` après que l'utilisateur s'est authentifié chez sa banque.
 * On l'échange contre une session, puis on crée/met à jour l'établissement
 * correspondant (nom pris tel quel de la réponse — jamais "BoursoBank" codé
 * en dur, ce serait faux en sandbox où c'est "Mock ASPSP").
 */
export async function GET(request: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL!;
  const code = request.nextUrl.searchParams.get("code");
  const stateRecu = request.nextUrl.searchParams.get("state");
  const erreurRecue = request.nextUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const cookieBrut = cookieStore.get(NOM_COOKIE_STATE)?.value;
  cookieStore.delete(NOM_COOKIE_STATE);

  // Rétrocompatible avec un cookie qui ne contiendrait que le state brut
  // (ancien format) — évite de casser une tentative de connexion en cours
  // pendant le déploiement de ce changement.
  let stateAttendu: string | undefined;
  let libelle: string | null = null;
  try {
    const parsed = cookieBrut ? JSON.parse(cookieBrut) : null;
    stateAttendu = parsed?.state;
    libelle = parsed?.libelle ?? null;
  } catch {
    stateAttendu = cookieBrut;
  }

  if (erreurRecue || !code || !stateRecu || stateRecu !== stateAttendu) {
    return NextResponse.redirect(`${site}/reglages/connexions?enable_banking=erreur`);
  }

  try {
    const session = await creerSession({ code, sandbox: EB_SANDBOX });
    // Nom de l'établissement à créer/mettre à jour — celui de la banque par
    // défaut, ou le libellé distinctif choisi au démarrage de la connexion
    // (cf. connecterBanque) pour ne jamais confondre deux connexions vers la
    // même banque sous des identités différentes (ex. Crédit Mutuel de
    // Maxime vs Crédit Mutuel d'Amélie).
    const nomInstitution = libelle || session.aspspNom;

    const [institutionExistante] = await db
      .select()
      .from(institutions)
      .where(eq(institutions.nom, nomInstitution));

    if (institutionExistante) {
      await db
        .update(institutions)
        .set({
          methodeConnexion: "psd2",
          consentementEtat: "actif",
          consentementExpireLe: session.validJusqua.slice(0, 10),
          enableBankingSessionId: session.sessionId,
          enableBankingComptes: session.comptes,
        })
        .where(eq(institutions.id, institutionExistante.id));
    } else {
      await db.insert(institutions).values({
        nom: nomInstitution,
        type: "banque",
        methodeConnexion: "psd2",
        consentementEtat: "actif",
        consentementExpireLe: session.validJusqua.slice(0, 10),
        enableBankingSessionId: session.sessionId,
        enableBankingComptes: session.comptes,
      });
    }

    return NextResponse.redirect(`${site}/reglages/connexions?enable_banking=ok`);
  } catch (e) {
    console.error("Enable Banking callback :", e);
    return NextResponse.redirect(`${site}/reglages/connexions?enable_banking=erreur`);
  }
}
