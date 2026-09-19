"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { actifs, comptes, institutions, positions } from "@/db/schema";
import { rafraichirCoursActif } from "@/lib/pricing/rafraichir";
import { rechercherSurCoinGecko } from "@/lib/pricing/adaptateurs/coingecko";
import { obtenirSoldesCoinbase } from "@/lib/coinbase/client";

export async function creerPosition(formData: FormData) {
  const compteId = String(formData.get("compteId") ?? "").trim();
  const actifId = String(formData.get("actifId") ?? "").trim();
  const quantite = String(formData.get("quantite") ?? "").trim();
  const prixRevientMoyen = String(formData.get("prixRevientMoyen") ?? "").trim();
  if (!compteId || !actifId || !quantite) return;

  await db.insert(positions).values({
    compteId,
    actifId,
    quantite,
    prixRevientMoyen: prixRevientMoyen || null,
  });
  revalidatePath("/patrimoine");
}

/** Rafraîchit le cours de tous les actifs ayant une source automatique. */
export async function actualiserCours() {
  const liste = await db.select().from(actifs);
  await Promise.allSettled(liste.map((a) => rafraichirCoursActif(a.id)));
  revalidatePath("/patrimoine");
}

export type EtatSyncCoinbase =
  | { statut: "repos" }
  | { statut: "ok"; nombre: number; ignores: string[] }
  | { statut: "erreur"; message: string };

/**
 * Synchronise les soldes Coinbase (lecture seule, SPEC.md §5.4) vers de
 * vraies positions : crée l'actif s'il n'existe pas encore (recherche par
 * symbole sur CoinGecko), puis crée ou met à jour la position sur le compte
 * Coinbase. La quantité Coinbase fait toujours foi (écrasée à chaque sync) ;
 * le prix de revient moyen n'est pas connu par cette API et reste donc tel
 * quel s'il a déjà été saisi à la main.
 */
export async function synchroniserCoinbase(): Promise<EtatSyncCoinbase> {
  try {
    const [compteCoinbase] = await db
      .select({ id: comptes.id })
      .from(comptes)
      .innerJoin(institutions, eq(comptes.institutionId, institutions.id))
      .where(eq(institutions.nom, "Coinbase"));

    if (!compteCoinbase) {
      return {
        statut: "erreur",
        message: 'Aucun compte rattaché à un établissement "Coinbase" dans les réglages.',
      };
    }

    const soldes = await obtenirSoldesCoinbase();
    const ignores: string[] = [];
    let nombre = 0;

    for (const solde of soldes) {
      let [actif] = await db
        .select()
        .from(actifs)
        .where(eq(actifs.identifiantExterne, solde.devise));

      if (!actif) {
        const trouve = await rechercherSurCoinGecko(solde.devise);
        if (!trouve) {
          ignores.push(solde.devise);
          continue;
        }
        [actif] = await db
          .insert(actifs)
          .values({
            libelle: trouve.nom,
            type: "crypto",
            identifiantExterne: solde.devise,
            sourcePrix: "coingecko",
            identifiantSource: trouve.identifiantSource,
            devise: "EUR",
          })
          .returning();
      }

      const [positionExistante] = await db
        .select()
        .from(positions)
        .where(and(eq(positions.compteId, compteCoinbase.id), eq(positions.actifId, actif.id)));

      if (positionExistante) {
        await db
          .update(positions)
          .set({ quantite: String(solde.quantite), updatedAt: new Date() })
          .where(eq(positions.id, positionExistante.id));
      } else {
        await db.insert(positions).values({
          compteId: compteCoinbase.id,
          actifId: actif.id,
          quantite: String(solde.quantite),
        });
      }

      await rafraichirCoursActif(actif.id).catch(() => null);
      nombre += 1;
    }

    revalidatePath("/patrimoine");
    return { statut: "ok", nombre, ignores };
  } catch (e) {
    return { statut: "erreur", message: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
