"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { comptes, actifs, positions, institutions } from "@/db/schema";

/**
 * Un compte relié à une connexion DSP2 doit apparaître dans le patrimoine
 * sans étape manuelle supplémentaire — avant, il fallait créer l'actif
 * "cash" à la main (réglages/actifs, avec un champ technique "identifiant
 * dans cette source" que seul un uid Enable Banking peut remplir) puis la
 * position (patrimoine, formulaire "+"). Les deux sont maintenant créés ici,
 * au moment même où le compte est relié. Le prix (solde réel) arrive avec la
 * prochaine actualisation (tirer pour actualiser), comme pour tout actif
 * "enable_banking" — inutile de l'aller chercher ici.
 */
async function assurerActifEtPositionCash(params: {
  compteId: string;
  institutionId: string;
  enableBankingAccountId: string;
  devise: string;
}): Promise<void> {
  let [actif] = await db
    .select()
    .from(actifs)
    .where(eq(actifs.identifiantSource, params.enableBankingAccountId));

  if (!actif) {
    const [institution] = await db.select().from(institutions).where(eq(institutions.id, params.institutionId));
    [actif] = await db
      .insert(actifs)
      .values({
        libelle: institution?.nom ?? "Compte bancaire",
        type: "cash",
        devise: params.devise,
        sourcePrix: "enable_banking",
        identifiantSource: params.enableBankingAccountId,
      })
      .returning();
  }

  const [positionExistante] = await db
    .select()
    .from(positions)
    .where(and(eq(positions.compteId, params.compteId), eq(positions.actifId, actif.id)));
  if (!positionExistante) {
    await db.insert(positions).values({ compteId: params.compteId, actifId: actif.id, quantite: "1" });
  }
}

export async function creerCompte(formData: FormData) {
  const libelle = String(formData.get("libelle") ?? "").trim();
  const institutionId = String(formData.get("institutionId") ?? "").trim();
  const personneId = String(formData.get("personneId") ?? "").trim();
  const enveloppeId = String(formData.get("enveloppeId") ?? "").trim();
  if (!libelle || !institutionId || !personneId || !enveloppeId) return;

  // Présent uniquement quand ce compte vient de "Comptes détectés" (un
  // compte externe déjà connecté en DSP2 — cf. reglages/comptes/page.tsx) :
  // rattache dès la création plutôt que de laisser un compte "nu" qu'il
  // faudrait relier après coup.
  const enableBankingAccountId = String(formData.get("enableBankingAccountId") ?? "").trim();
  const devise = String(formData.get("devise") ?? "EUR").trim() || "EUR";

  const [compte] = await db
    .insert(comptes)
    .values({
      libelle,
      institutionId,
      personneId,
      enveloppeId,
      devise,
      enableBankingAccountId: enableBankingAccountId || null,
    })
    .returning();

  if (enableBankingAccountId) {
    await assurerActifEtPositionCash({ compteId: compte.id, institutionId, enableBankingAccountId, devise });
  }

  revalidatePath("/reglages/comptes");
  revalidatePath("/patrimoine");
}

/**
 * Relie un compte déjà créé (ex. "Compte commun", créé à la main avant toute
 * connexion bancaire) à un compte externe détecté — plutôt que d'en créer un
 * doublon quand le compte du patrimoine existe déjà.
 */
export async function relierCompteExistant(formData: FormData) {
  const compteId = String(formData.get("compteId") ?? "").trim();
  const enableBankingAccountId = String(formData.get("enableBankingAccountId") ?? "").trim();
  if (!compteId || !enableBankingAccountId) return;

  const [compte] = await db.update(comptes).set({ enableBankingAccountId }).where(eq(comptes.id, compteId)).returning();
  if (compte) {
    await assurerActifEtPositionCash({
      compteId: compte.id,
      institutionId: compte.institutionId,
      enableBankingAccountId,
      devise: compte.devise,
    });
  }

  revalidatePath("/reglages/comptes");
  revalidatePath("/patrimoine");
}
