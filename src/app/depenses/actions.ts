"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { synchroniserTransactionsBancaires } from "@/app/patrimoine/actions";

/**
 * Le "détecteur de nouvelle transaction" n'est pas un processus séparé — il
 * n'y a rien à détecter en tâche de fond : on relance le même import
 * incrémental que le patrimoine (rien avant la dernière transaction déjà
 * connue, jamais tout l'historique), et toute transaction fraîchement
 * insérée arrive avec le statut "à catégoriser", donc remonte d'elle-même en
 * tête de la file au prochain rendu de la page.
 */
export async function actualiserTransactions() {
  await synchroniserTransactionsBancaires();
  revalidatePath("/depenses");
}

/**
 * Catégorise une transaction — vers une catégorie existante (`categorieId`)
 * ou une toute nouvelle, créée à la volée (`nouvelleCategorie`) plutôt que de
 * forcer un aller-retour par les réglages pendant le tri.
 */
export async function categoriserTransaction(formData: FormData) {
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const categorieIdBrut = String(formData.get("categorieId") ?? "").trim();
  const nouvelleCategorie = String(formData.get("nouvelleCategorie") ?? "").trim();
  if (!transactionId || (!categorieIdBrut && !nouvelleCategorie)) return;

  const categorieId = nouvelleCategorie
    ? (await db.insert(categories).values({ libelle: nouvelleCategorie }).returning())[0].id
    : categorieIdBrut;

  await db
    .update(transactions)
    .set({ categorieId, statut: "categorise" })
    .where(eq(transactions.id, transactionId));

  revalidatePath("/depenses");
}
