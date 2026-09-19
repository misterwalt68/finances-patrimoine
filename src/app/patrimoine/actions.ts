"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { actifs, comptes, cours, institutions, parametres, positions } from "@/db/schema";
import { rafraichirCoursActif } from "@/lib/pricing/rafraichir";
import { rechercherSurCoinGecko } from "@/lib/pricing/adaptateurs/coingecko";
import { obtenirAdaptateur } from "@/lib/pricing/registre";
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

const SEUIL_POUSSIERE_PAR_DEFAUT = 5;

/**
 * Seuil (€) en dessous duquel une position crypto n'est pas synchronisée —
 * une donnée réglable (`parametres`), pas une constante : Maxime a donné une
 * fourchette floue ("4-5 €"), donc c'est ajustable sans toucher au code.
 */
async function obtenirSeuilPoussiereCrypto(): Promise<number> {
  const [ligne] = await db
    .select()
    .from(parametres)
    .where(eq(parametres.cle, "seuil_poussiere_crypto"));
  const valeur = ligne?.valeur;
  return typeof valeur === "number" ? valeur : SEUIL_POUSSIERE_PAR_DEFAUT;
}

export type EtatSyncCoinbase =
  | { statut: "repos" }
  | { statut: "ok"; nombre: number; ignores: string[]; sousLeSeuil: string[] }
  | { statut: "erreur"; message: string };

/**
 * Synchronise les soldes Coinbase (lecture seule, SPEC.md §5.4) vers de
 * vraies positions.
 *
 * - Crée l'actif s'il n'existe pas (recherche du symbole sur CoinGecko).
 * - Ignore (ne crée/ne met à jour rien) tout solde dont la valeur estimée
 *   est sous le seuil de "poussière" — des reliquats de crypto illiquides
 *   que Maxime ne considère pas comme de vraies positions.
 * - Toute position Coinbase existante qui n'est plus retrouvée dans ce
 *   passage (vendue, ou repassée sous le seuil) est supprimée : Coinbase
 *   fait foi, pas l'historique local.
 * - Le prix de revient moyen n'est pas fourni par cette API et n'est jamais
 *   deviné ; s'il existe déjà (saisi à la main), il n'est pas touché.
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

    const seuil = await obtenirSeuilPoussiereCrypto();
    const soldes = await obtenirSoldesCoinbase();
    const adaptateurCoinGecko = obtenirAdaptateur("coingecko")!;

    const ignores: string[] = [];
    const sousLeSeuil: string[] = [];
    const actifIdsPresents = new Set<string>();
    let nombre = 0;

    for (const solde of soldes) {
      const [actifExistant] = await db
        .select()
        .from(actifs)
        .where(eq(actifs.identifiantExterne, solde.devise));

      let identifiantSource = actifExistant?.identifiantSource ?? null;
      let nomTrouve: string | null = null;

      if (!actifExistant) {
        const trouve = await rechercherSurCoinGecko(solde.devise);
        if (!trouve) {
          ignores.push(solde.devise);
          continue;
        }
        identifiantSource = trouve.identifiantSource;
        nomTrouve = trouve.nom;
      }

      // Prix nécessaire pour juger du seuil, avant de créer quoi que ce soit.
      let prix: number | null = null;
      try {
        prix = (await adaptateurCoinGecko.obtenirPrix(identifiantSource!, "EUR")).prix;
      } catch {
        prix = null;
      }

      const valeurEstimee = prix !== null ? prix * solde.quantite : null;
      if (valeurEstimee !== null && valeurEstimee < seuil) {
        sousLeSeuil.push(solde.devise);
        continue;
      }

      const actif =
        actifExistant ??
        (
          await db
            .insert(actifs)
            .values({
              libelle: nomTrouve!,
              type: "crypto",
              identifiantExterne: solde.devise,
              sourcePrix: "coingecko",
              identifiantSource: identifiantSource!,
              devise: "EUR",
            })
            .returning()
        )[0];

      actifIdsPresents.add(actif.id);

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

      if (prix !== null) {
        await db.insert(cours).values({
          actifId: actif.id,
          horodatage: new Date(),
          prix: String(prix),
          source: "coingecko",
        });
      }

      nombre += 1;
    }

    const positionsCoinbase = await db
      .select({ id: positions.id, actifId: positions.actifId })
      .from(positions)
      .where(eq(positions.compteId, compteCoinbase.id));
    const idsASupprimer = positionsCoinbase
      .filter((p) => !actifIdsPresents.has(p.actifId))
      .map((p) => p.id);
    if (idsASupprimer.length > 0) {
      await db.delete(positions).where(inArray(positions.id, idsASupprimer));
    }

    revalidatePath("/patrimoine");
    return { statut: "ok", nombre, ignores, sousLeSeuil };
  } catch (e) {
    return { statut: "erreur", message: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
