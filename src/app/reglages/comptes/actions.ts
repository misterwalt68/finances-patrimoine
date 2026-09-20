"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { comptes } from "@/db/schema";

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

  await db.insert(comptes).values({
    libelle,
    institutionId,
    personneId,
    enveloppeId,
    devise: String(formData.get("devise") ?? "EUR").trim() || "EUR",
    enableBankingAccountId: enableBankingAccountId || null,
  });
  revalidatePath("/reglages/comptes");
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

  await db.update(comptes).set({ enableBankingAccountId }).where(eq(comptes.id, compteId));
  revalidatePath("/reglages/comptes");
}
