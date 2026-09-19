import { eq } from "drizzle-orm";
import { db } from "@/db";
import { actifs, cours } from "@/db/schema";
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

  return prix;
}
