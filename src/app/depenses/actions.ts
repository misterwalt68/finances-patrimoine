"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions, reglesCategorisation } from "@/db/schema";
import { synchroniserTransactionsBancaires } from "@/app/patrimoine/actions";

/**
 * Interrupteur unique pour toute la catégorisation automatique — désactivée
 * à la demande de Maxime le temps qu'il prenne confiance dans le tri manuel
 * ("pour le moment on peut que le faire manuellement"). Le mécanisme reste
 * en place (règles toujours enregistrées à chaque tri manuel, cf.
 * `categoriser` ci-dessous) pour pouvoir la réactiver d'un coup plus tard,
 * sans perdre l'historique des règles apprises entre-temps.
 */
const CATEGORISATION_AUTOMATIQUE_ACTIVE = false;

/**
 * Aucune transaction n'est jamais devinée. La première occurrence d'un
 * libellé passe toujours par un tri manuel ; c'est CE tri qui enregistre la
 * règle (libellé exact → catégorie). Tant que
 * `CATEGORISATION_AUTOMATIQUE_ACTIVE` est à `false`, la règle est mémorisée
 * mais jamais appliquée toute seule — jamais de catégorisation automatique
 * "par défaut", seulement un rapprochement exact avec une catégorisation
 * déjà validée à la main, et seulement une fois réactivée.
 */
async function categoriser(transactionId: string, categorieId: string): Promise<void> {
  const [transaction] = await db
    .select({ commercant: transactions.commercant })
    .from(transactions)
    .where(eq(transactions.id, transactionId));

  await db.update(transactions).set({ categorieId, statut: "categorise" }).where(eq(transactions.id, transactionId));

  if (!transaction?.commercant) return;

  const [regleExistante] = await db
    .select()
    .from(reglesCategorisation)
    .where(eq(reglesCategorisation.commercant, transaction.commercant));

  if (regleExistante) {
    if (regleExistante.categorieId !== categorieId) {
      await db.update(reglesCategorisation).set({ categorieId }).where(eq(reglesCategorisation.id, regleExistante.id));
    }
  } else {
    await db.insert(reglesCategorisation).values({ commercant: transaction.commercant, categorieId });
  }

  if (!CATEGORISATION_AUTOMATIQUE_ACTIVE) return;

  // Les autres transactions déjà en attente avec le MÊME libellé exact
  // profitent immédiatement de la règle qui vient d'être créée — inutile de
  // les trier une par une si le libellé est rigoureusement identique.
  await db
    .update(transactions)
    .set({ categorieId, statut: "categorise" })
    .where(
      and(
        eq(transactions.commercant, transaction.commercant),
        eq(transactions.statut, "a_categoriser"),
      ),
    );
}

export async function categoriserTransaction(formData: FormData) {
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const categorieId = String(formData.get("categorieId") ?? "").trim();
  if (!transactionId || !categorieId) return;

  await categoriser(transactionId, categorieId);

  revalidatePath("/depenses");
  revalidatePath("/depenses/trier");
}

/** Créée depuis l'écran de tri (glisser vers "Ajouter une catégorie") — crée la catégorie et catégorise dans le même geste. */
export async function creerCategorieEtCategoriser(formData: FormData) {
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const libelle = String(formData.get("libelle") ?? "").trim();
  const icone = String(formData.get("icone") ?? "").trim();
  if (!transactionId || !libelle) return;

  const [categorie] = await db.insert(categories).values({ libelle, icone: icone || null }).returning();
  await categoriser(transactionId, categorie.id);

  revalidatePath("/depenses");
  revalidatePath("/depenses/trier");
  revalidatePath("/reglages/categories");
  return { id: categorie.id, libelle: categorie.libelle, icone: categorie.icone };
}

/**
 * Applique les règles apprises aux transactions encore en attente — jamais
 * de devinette : seulement un libellé strictement identique à une
 * catégorisation déjà validée à la main (cf. `categoriser` ci-dessus).
 */
async function appliquerReglesApprises(): Promise<void> {
  const enAttente = await db
    .select({ id: transactions.id, commercant: transactions.commercant })
    .from(transactions)
    .where(eq(transactions.statut, "a_categoriser"));
  const avecLibelle = enAttente.filter((t) => t.commercant);
  if (avecLibelle.length === 0) return;

  const regles = await db.select().from(reglesCategorisation);
  const regleParCommercant = new Map(
    regles.filter((r) => r.commercant).map((r) => [r.commercant as string, r.categorieId]),
  );

  for (const t of avecLibelle) {
    const categorieId = regleParCommercant.get(t.commercant as string);
    if (categorieId) {
      await db.update(transactions).set({ categorieId, statut: "categorise" }).where(eq(transactions.id, t.id));
    }
  }
}

/**
 * Le "détecteur de nouvelle transaction" n'est pas un processus séparé — il
 * n'y a rien à détecter en tâche de fond : on relance le même import
 * incrémental que le patrimoine (rien avant la dernière transaction déjà
 * connue, jamais tout l'historique) ; tout ce qui arrive est "à catégoriser"
 * et remonte de soi-même en tête de la file au prochain rendu. Les règles
 * apprises ne sont PAS appliquées tant que `CATEGORISATION_AUTOMATIQUE_ACTIVE`
 * est à `false` — 100% manuel pour l'instant, à la demande de Maxime.
 */
export async function actualiserTransactions() {
  await synchroniserTransactionsBancaires();
  if (CATEGORISATION_AUTOMATIQUE_ACTIVE) await appliquerReglesApprises();
  revalidatePath("/depenses");
  revalidatePath("/depenses/trier");
}
