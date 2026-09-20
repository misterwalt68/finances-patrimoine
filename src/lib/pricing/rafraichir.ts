import { eq } from "drizzle-orm";
import { db } from "@/db";
import { actifs, cours, positions } from "@/db/schema";
import { obtenirAdaptateur } from "./registre";

/**
 * Rafraîchit le cours d'un actif via son adaptateur et l'enregistre dans
 * `cours`. Ne fait rien pour une source "manuel" : rien à aller chercher,
 * c'est l'utilisateur qui saisit le prix (SPEC.md §5.5, §5.6).
 * Retourne le nouveau prix, ou `null` si rien n'a été rafraîchi.
 */
export async function rafraichirCoursActif(actifId: string): Promise<number | null> {
  const [actif] = await db.select().from(actifs).where(eq(actifs.id, actifId));
  if (!actif) throw new Error("Actif introuvable");

  if (actif.sourcePrix === "manuel" || !actif.identifiantSource) {
    return null;
  }

  const adaptateur = obtenirAdaptateur(actif.sourcePrix);
  if (!adaptateur) {
    throw new Error(`Aucun adaptateur enregistré pour la source "${actif.sourcePrix}"`);
  }

  const { prix, horodatage } = await adaptateur.obtenirPrix(actif.identifiantSource, actif.devise);

  await db.insert(cours).values({
    actifId: actif.id,
    horodatage,
    prix: String(prix),
    source: actif.sourcePrix,
  });

  // Un compte bancaire (DSP2) n'est pas un investissement : son solde n'a
  // pas de "prix de revient" au sens où l'entend le reste de l'app (SPEC
  // §4, apports vs performance). On aligne le prix de revient sur le
  // dernier solde connu pour que la position affiche sa vraie valeur sans
  // jamais faire apparaître un "gain" ou une "perte" qui n'a pas de sens ici.
  if (actif.type === "cash" || actif.type === "securite") {
    await db
      .update(positions)
      .set({ prixRevientMoyen: String(prix) })
      .where(eq(positions.actifId, actif.id));
  }

  return prix;
}
