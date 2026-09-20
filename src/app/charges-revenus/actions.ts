"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
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

  revalidatePath("/charges-revenus");
}

/**
 * Modifie une ligne au complet, exactement comme à la création — libellé,
 * infos pratiques, ET montant, plutôt que d'obliger à passer par un autre
 * bouton pour changer le montant (source de confusion : "modifier" doit
 * permettre de tout remodifier). Le montant n'écrase l'historique que s'il a
 * réellement changé — une simple correction du fournisseur ne doit pas
 * ajouter un faux point "toujours le même montant, aujourd'hui" à la courbe
 * d'évolution.
 */
export async function modifierChargeRevenu(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const libelle = String(formData.get("libelle") ?? "").trim();
  const periodicite = String(formData.get("periodicite") ?? "").trim();
  const personneId = String(formData.get("personneId") ?? "").trim();
  const montant = String(formData.get("montant") ?? "").trim();
  const dateEffet = String(formData.get("dateEffet") ?? "").trim();
  if (!id || !libelle || !periodicite || !personneId || !montant || !dateEffet) return;

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

  const [dernier] = await db
    .select()
    .from(chargesRevenusHistorique)
    .where(eq(chargesRevenusHistorique.chargeRevenuId, id))
    .orderBy(desc(chargesRevenusHistorique.dateEffet), desc(chargesRevenusHistorique.createdAt))
    .limit(1);

  if (!dernier || Number(dernier.montant) !== Number(montant)) {
    await db.insert(chargesRevenusHistorique).values({ chargeRevenuId: id, montant, dateEffet });
  }

  revalidatePath("/charges-revenus");
}

export async function supprimerChargeRevenu(id: string) {
  await db.delete(chargesRevenus).where(eq(chargesRevenus.id, id));
  revalidatePath("/charges-revenus");
}
