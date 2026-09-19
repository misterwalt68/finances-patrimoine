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
  const stateAttendu = cookieStore.get(NOM_COOKIE_STATE)?.value;
  cookieStore.delete(NOM_COOKIE_STATE);

  if (erreurRecue || !code || !stateRecu || stateRecu !== stateAttendu) {
    return NextResponse.redirect(`${site}/reglages/connexions?enable_banking=erreur`);
  }

  try {
    const session = await creerSession({ code, sandbox: EB_SANDBOX });

    const [institutionExistante] = await db
      .select()
      .from(institutions)
      .where(eq(institutions.nom, session.aspspNom));

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
        nom: session.aspspNom,
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
