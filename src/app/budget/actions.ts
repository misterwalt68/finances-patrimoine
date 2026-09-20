"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chargesRevenus, chargesRevenusHistorique } from "@/db/schema";

export async function creerChargeRevenu(formData: FormData) {
  const type = String(formData.get("type") ?? "").trim();
  const libelle = String(formData.get("libelle") ?? "").trim();
  const periodicite = String(formData.get("periodicite") ?? "").trim();
  const personneId = String(formData.get("personneId") ?? "").trim();
  const montant = String(formData.get("montant") ?? "").trim();
  const dateEffet = String(formData.get("dateEffet") ?? "").trim();
  if (!type || !libelle || !periodicite || !personneId || !montant || !dateEffet) return;

  const fournisseur = String(formData.get("fournisseur") ?? "").trim();
  const numeroClient = String(formData.get("numeroClient") ?? "").trim();
  const lienSuivi = String(formData.get("lienSuivi") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const [charge] = await db
    .insert(chargesRevenus)
    .values({
      type,
      libelle,
      periodicite,
      personneId,
      fournisseur: fournisseur || null,
      numeroClient: numeroClient || null,
      lienSuivi: lienSuivi || null,
      note: note || null,
    })
    .returning();

  await db.insert(chargesRevenusHistorique).values({ chargeRevenuId: charge.id, montant, dateEffet });

  revalidatePath("/budget");
}

/** Métadonnées uniquement — le montant se modifie via `ajouterMontant`, jamais ici, pour ne pas perdre l'historique. */
export async function modifierChargeRevenu(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const libelle = String(formData.get("libelle") ?? "").trim();
  const periodicite = String(formData.get("periodicite") ?? "").trim();
  const personneId = String(formData.get("personneId") ?? "").trim();
  if (!id || !libelle || !periodicite || !personneId) return;

  const fournisseur = String(formData.get("fournisseur") ?? "").trim();
  const numeroClient = String(formData.get("numeroClient") ?? "").trim();
  const lienSuivi = String(formData.get("lienSuivi") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  await db
    .update(chargesRevenus)
    .set({
      libelle,
      periodicite,
      personneId,
      fournisseur: fournisseur || null,
      numeroClient: numeroClient || null,
      lienSuivi: lienSuivi || null,
      note: note || null,
    })
    .where(eq(chargesRevenus.id, id));

  revalidatePath("/budget");
}

/**
 * Ajoute un nouveau montant à l'historique d'une charge/revenu plutôt que
 * d'écraser l'ancien — c'est ce qui permet de voir plus tard "la taxe
 * foncière a augmenté chaque année depuis 5 ans" au lieu de perdre les
 * valeurs précédentes à chaque mise à jour.
 */
export async function ajouterMontantHistorique(formData: FormData) {
  const chargeRevenuId = String(formData.get("chargeRevenuId") ?? "").trim();
  const montant = String(formData.get("montant") ?? "").trim();
  const dateEffet = String(formData.get("dateEffet") ?? "").trim();
  if (!chargeRevenuId || !montant || !dateEffet) return;

  await db.insert(chargesRevenusHistorique).values({ chargeRevenuId, montant, dateEffet });
  revalidatePath("/budget");
}

export async function supprimerChargeRevenu(id: string) {
  await db.delete(chargesRevenus).where(eq(chargesRevenus.id, id));
  revalidatePath("/budget");
}
