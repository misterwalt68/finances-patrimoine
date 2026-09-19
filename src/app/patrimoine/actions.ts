"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { actifs, comptes, cours, institutions, parametres, positions } from "@/db/schema";
import { rafraichirCoursActif } from "@/lib/pricing/rafraichir";
import { rechercherSurCoinGecko } from "@/lib/pricing/adaptateurs/coingecko";
import { obtenirAdaptateur } from "@/lib/pricing/registre";
import { obtenirHistoriqueOr } from "@/lib/pricing/adaptateurs/metaux";
import { obtenirSoldesCoinbase } from "@/lib/coinbase/client";
import { METAUX_PHYSIQUES } from "@/lib/constants";

/** Trouve l'actif d'un métal (symbole fixe, cf. constants.ts) ou le crée. */
async function trouverOuCreerActifMetal(symbole: string) {
  const [existant] = await db.select().from(actifs).where(eq(actifs.identifiantExterne, symbole));
  if (existant) return existant;

  const metal = METAUX_PHYSIQUES.find((m) => m.symbole === symbole);
  if (!metal) throw new Error(`Métal inconnu : ${symbole}`);

  const [cree] = await db
    .insert(actifs)
    .values({
      libelle: metal.libelle,
      type: "metal",
      identifiantExterne: metal.symbole,
      sourcePrix: metal.sourcePrix,
      identifiantSource: metal.sourcePrix === "metaux" ? metal.symbole : null,
      devise: "EUR",
    })
    .returning();
  return cree;
}

/**
 * Compte physique unique pour les métaux — pas la peine de le redemander à
 * chaque ajout, il n'y en a qu'un. Décision de Maxime : la question du
 * compte n'a de sens que s'il y a un choix réel.
 */
async function obtenirCompteMetauxPhysiques() {
  const [compte] = await db.select().from(comptes).where(eq(comptes.libelle, "Métaux physiques"));
  if (!compte) throw new Error('Compte "Métaux physiques" introuvable — à créer dans les réglages.');
  return compte;
}

export async function creerPosition(formData: FormData) {
  const metalSymbole = String(formData.get("metalSymbole") ?? "").trim();
  const actifIdBrut = String(formData.get("actifId") ?? "").trim();
  const compteIdBrut = String(formData.get("compteId") ?? "").trim();
  const quantite = String(formData.get("quantite") ?? "").trim();
  const prixRevientMoyen = String(formData.get("prixRevientMoyen") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const dateAcquisition = String(formData.get("dateAcquisition") ?? "").trim();
  if (!quantite || (!actifIdBrut && !metalSymbole)) return;
  if (!metalSymbole && !compteIdBrut) return;

  const actifId = metalSymbole ? (await trouverOuCreerActifMetal(metalSymbole)).id : actifIdBrut;
  const compteId = metalSymbole ? (await obtenirCompteMetauxPhysiques()).id : compteIdBrut;

  await db.insert(positions).values({
    compteId,
    actifId,
    quantite,
    prixRevientMoyen: prixRevientMoyen || null,
    note: note || null,
    dateAcquisition: dateAcquisition || null,
  });

  // Un métal en cours manuel n'a pas d'adaptateur : le prix d'achat saisi
  // sert de première valeur connue, sinon la position resterait sans cours.
  const metal = METAUX_PHYSIQUES.find((m) => m.symbole === metalSymbole);
  if (metal?.sourcePrix === "manuel" && prixRevientMoyen) {
    await db.insert(cours).values({
      actifId,
      horodatage: new Date(),
      prix: prixRevientMoyen,
      source: "manuel",
    });
  }

  revalidatePath("/patrimoine");
}

/**
 * Suppression manuelle d'une position (ex. un métal vendu dans la vraie
 * vie) — la confirmation par saisie de texte se fait côté client, pas ici.
 */
export async function supprimerPosition(id: string) {
  await db.delete(positions).where(eq(positions.id, id));
  revalidatePath("/patrimoine");
}

export type EtatHistoriqueOr =
  | { statut: "repos" }
  | { statut: "ok"; nombre: number }
  | { statut: "erreur"; message: string };

/**
 * Charge l'historique complet (25+ ans, Yahoo Finance) de l'or dans `cours`,
 * pour le graphique historique. Ré-exécutable sans dupliquer : les points
 * déjà enregistrés comme historique sont remplacés, pas cumulés.
 */
export async function chargerHistoriqueOr(): Promise<EtatHistoriqueOr> {
  try {
    const [or] = await db.select().from(actifs).where(eq(actifs.identifiantExterne, "XAU"));
    if (!or) return { statut: "erreur", message: 'Actif "Or" introuvable.' };

    const points = await obtenirHistoriqueOr();

    await db
      .delete(cours)
      .where(and(eq(cours.actifId, or.id), eq(cours.source, "metaux_historique")));

    if (points.length > 0) {
      await db.insert(cours).values(
        points.map((p) => ({
          actifId: or.id,
          horodatage: p.date,
          prix: String(p.prix),
          source: "metaux_historique",
        })),
      );
    }

    revalidatePath("/patrimoine");
    return { statut: "ok", nombre: points.length };
  } catch (e) {
    return { statut: "erreur", message: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

/**
 * Un seul bouton qui met tout à jour : synchronise Coinbase (crée/actualise/
 * retire des positions) puis rafraîchit le cours de tous les actifs ayant
 * une source automatique. Fusionné à la demande de Maxime — avoir un
 * encart Coinbase séparé n'apportait rien de plus qu'un bouton "tout
 * actualiser" unique.
 */
export async function actualiserCours() {
  await synchroniserCoinbase().catch(() => null);
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
 * - Un solde staké va sur le compte "Coinbase (staking)", un solde liquide
 *   sur le compte "Coinbase" — c'est ce badge de compte, déjà affiché sur
 *   chaque position, qui sert d'indicateur "staké ou non", sans champ
 *   dédié ni bidouillage d'affichage.
 * - Ignore (ne crée/ne met à jour rien) tout solde dont la valeur estimée
 *   est sous le seuil de "poussière" — des reliquats de crypto illiquides
 *   que Maxime ne considère pas comme de vraies positions.
 * - Toute position Coinbase existante (sur l'un ou l'autre compte) qui n'est
 *   plus retrouvée dans ce passage (vendue, ou repassée sous le seuil) est
 *   supprimée : Coinbase fait foi, pas l'historique local.
 * - Le prix de revient moyen n'est pas fourni par cette API et n'est jamais
 *   deviné ; s'il existe déjà (saisi à la main), il n'est pas touché.
 */
export async function synchroniserCoinbase(): Promise<EtatSyncCoinbase> {
  try {
    const comptesCoinbase = await db
      .select({ id: comptes.id, libelle: comptes.libelle })
      .from(comptes)
      .innerJoin(institutions, eq(comptes.institutionId, institutions.id))
      .where(eq(institutions.nom, "Coinbase"));

    const compteLiquide = comptesCoinbase.find((c) => !/staking/i.test(c.libelle));
    const compteStaking = comptesCoinbase.find((c) => /staking/i.test(c.libelle));

    if (!compteLiquide) {
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
    // Positions "présentes" par compte, pour le nettoyage final de chacun.
    const presentsParCompte = new Map<string, Set<string>>();
    let nombre = 0;

    for (const solde of soldes) {
      const compteCible = solde.stake && compteStaking ? compteStaking : compteLiquide;

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

      if (!presentsParCompte.has(compteCible.id)) presentsParCompte.set(compteCible.id, new Set());
      presentsParCompte.get(compteCible.id)!.add(actif.id);

      const [positionExistante] = await db
        .select()
        .from(positions)
        .where(and(eq(positions.compteId, compteCible.id), eq(positions.actifId, actif.id)));

      if (positionExistante) {
        await db
          .update(positions)
          .set({ quantite: String(solde.quantite), updatedAt: new Date() })
          .where(eq(positions.id, positionExistante.id));
      } else {
        await db.insert(positions).values({
          compteId: compteCible.id,
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

    for (const compte of comptesCoinbase) {
      const presents = presentsParCompte.get(compte.id) ?? new Set<string>();
      const positionsDuCompte = await db
        .select({ id: positions.id, actifId: positions.actifId })
        .from(positions)
        .where(eq(positions.compteId, compte.id));
      const idsASupprimer = positionsDuCompte
        .filter((p) => !presents.has(p.actifId))
        .map((p) => p.id);
      if (idsASupprimer.length > 0) {
        await db.delete(positions).where(inArray(positions.id, idsASupprimer));
      }
    }

    revalidatePath("/patrimoine");
    return { statut: "ok", nombre, ignores, sousLeSeuil };
  } catch (e) {
    return { statut: "erreur", message: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
