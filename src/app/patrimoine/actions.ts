"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, ilike, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { actifs, comptes, cours, historiquePatrimoine, institutions, parametres, positions, transactions } from "@/db/schema";
import { rafraichirCoursActif } from "@/lib/pricing/rafraichir";
import { rechercherSurCoinGecko } from "@/lib/pricing/adaptateurs/coingecko";
import { obtenirAdaptateur } from "@/lib/pricing/registre";
import { obtenirHistoriqueMetal } from "@/lib/pricing/adaptateurs/metaux";
import { obtenirSoldesCoinbase, obtenirTransactionsCoinbase } from "@/lib/coinbase/client";
import { calculerCoutBaseMoyen } from "@/lib/coinbase/cout-base";
import { obtenirTransactionsBancaires, EB_SANDBOX } from "@/lib/enable-banking/client";
import { METAUX_PHYSIQUES } from "@/lib/constants";

/**
 * Modification manuelle d'une position existante. Quantité et prix de
 * revient sont absents du formulaire pour un actif "cash" (gérés
 * automatiquement, cf. rafraichirCoursActif) — `FormData.has` distingue
 * "champ absent, ne pas toucher" de "champ vidé, remettre à null".
 *
 * `valeurActuelle` (présent seulement pour un actif à cours "manuel", ex.
 * Livret A ou une future Assurance-vie) devient un nouveau point
 * d'historique dans `cours` — c'est la "valeur actuelle" (avec intérêts,
 * plus-values…), distincte du prix de revient (ce qui a été versé). Pour un
 * cash manuel, les deux sont la même chose par construction (pas de notion
 * d'investissement) : on garde alors `prixRevientMoyen` aligné dessus,
 * exactement comme le fait `rafraichirCoursActif` pour un cash automatique.
 */
export async function modifierPosition(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const compteId = String(formData.get("compteId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !compteId) return;

  const [positionExistante] = await db.select().from(positions).where(eq(positions.id, id));
  if (!positionExistante) return;
  const [actif] = await db.select().from(actifs).where(eq(actifs.id, positionExistante.actifId));

  const valeurs: Partial<typeof positions.$inferInsert> = {
    compteId,
    note: note || null,
  };

  // `formData.has(...)` distingue "champ absent du formulaire pour ce
  // contexte, ne pas toucher" (ex. date d'achat masquée pour un Livret A)
  // de "champ présent mais vidé, remettre à null".
  if (formData.has("quantite")) {
    valeurs.quantite = String(formData.get("quantite") ?? "").trim();
  }
  if (formData.has("prixRevientMoyen")) {
    valeurs.prixRevientMoyen = String(formData.get("prixRevientMoyen") ?? "").trim() || null;
  }
  if (formData.has("dateAcquisition")) {
    valeurs.dateAcquisition = String(formData.get("dateAcquisition") ?? "").trim() || null;
  }

  const valeurActuelle = String(formData.get("valeurActuelle") ?? "").trim();
  if (valeurActuelle && actif) {
    await db.insert(cours).values({
      actifId: actif.id,
      horodatage: new Date(),
      prix: valeurActuelle,
      source: "manuel",
    });
    if (actif.type === "cash" || actif.type === "securite") {
      valeurs.prixRevientMoyen = valeurActuelle;
    }
  }

  // Pour un "fonds" à cours manuel, Maxime ne connaît que ce que son courtier
  // affiche — la performance depuis le début, tantôt en euros ("+150"),
  // tantôt en pourcentage ("-11,15%") — jamais le montant investi brut. On le
  // déduit de la valeur actuelle plutôt que de le lui demander directement.
  const performanceBrute = String(formData.get("performanceGain") ?? "").trim();
  if (performanceBrute && valeurActuelle) {
    const nombreValeur = Number(valeurActuelle);
    const estPourcentage = performanceBrute.includes("%");
    const nombreGain = Number(performanceBrute.replace(/[%\s]/g, "").replace(",", "."));
    if (!Number.isNaN(nombreGain) && !Number.isNaN(nombreValeur)) {
      const montantInvesti = estPourcentage ? nombreValeur / (1 + nombreGain / 100) : nombreValeur - nombreGain;
      valeurs.prixRevientMoyen = montantInvesti.toFixed(2);
    }
  }

  await db.update(positions).set(valeurs).where(eq(positions.id, id));
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

/**
 * Corrige les actifs métaux déjà en base dont la source de prix ne
 * correspond plus à `METAUX_PHYSIQUES` — ex. argent/platine/palladium/cuivre,
 * créés en cours manuel avant qu'une source gratuite existe pour eux. Sans
 * ça, un actif déjà créé resterait bloqué sur son ancienne source même après
 * avoir changé la constante, puisqu'elle n'est lue qu'à la création.
 */
async function synchroniserSourcesMetaux(): Promise<void> {
  for (const metal of METAUX_PHYSIQUES) {
    const identifiantSourceAttendu = metal.sourcePrix === "metaux" ? metal.symbole : null;
    await db
      .update(actifs)
      .set({ sourcePrix: metal.sourcePrix, identifiantSource: identifiantSourceAttendu })
      .where(eq(actifs.identifiantExterne, metal.symbole));
  }
}

/**
 * Recharge l'historique (Yahoo Finance) de chaque métal à source automatique
 * dans `cours`, pour le graphique historique — appelé à chaque "Actualiser
 * les cours", plus besoin d'un bouton dédié.
 *
 * Incrémental : ne va chercher que les jours postérieurs au dernier point
 * déjà en base (25 ans complets uniquement au tout premier chargement) —
 * demandé par Maxime pour éviter de retélécharger et réinsérer ~6300 lignes
 * par métal à chaque clic alors que seuls les derniers jours changent.
 */
async function chargerHistoriqueMetaux(): Promise<void> {
  const metauxAutomatiques = METAUX_PHYSIQUES.filter((m) => m.sourcePrix === "metaux");

  await Promise.allSettled(
    metauxAutomatiques.map(async (metal) => {
      const [actif] = await db.select().from(actifs).where(eq(actifs.identifiantExterne, metal.symbole));
      if (!actif) return;

      const [dernier] = await db
        .select({ horodatage: cours.horodatage })
        .from(cours)
        .where(and(eq(cours.actifId, actif.id), eq(cours.source, "metaux_historique")))
        .orderBy(desc(cours.horodatage))
        .limit(1);

      const points = await obtenirHistoriqueMetal(metal.symbole, dernier?.horodatage);
      if (points.length === 0) return;

      await db.insert(cours).values(
        points.map((p) => ({
          actifId: actif.id,
          horodatage: p.date,
          prix: String(p.prix),
          source: "metaux_historique",
        })),
      );
    }),
  );
}

/**
 * Date de démarrage officielle de l'application (décision explicite de
 * Maxime, revue le 2026-09-23) — aucune transaction antérieure n'est plus
 * jamais importée, même pour un tout premier import sur un compte
 * nouvellement connecté. Avant la toute première version de cette
 * constante, le point de départ était glissant ("30 jours avant
 * aujourd'hui"), ce qui ramenait sans cesse de vieilles transactions à
 * trier ; un plancher fixe évite ça une bonne fois pour toutes.
 */
const DATE_DEMARRAGE_APPLICATION = "2026-09-23";

/**
 * Synchronise les transactions bancaires (DSP2, SPEC.md §5.1/§10) de chaque
 * compte rattaché à une connexion Enable Banking (`comptes.enableBankingAccountId`
 * non nul). Incrémental : ne récupère que ce qui est postérieur à la
 * dernière transaction déjà connue pour ce compte, jamais avant
 * `DATE_DEMARRAGE_APPLICATION` au tout premier import — jamais tout
 * l'historique bancaire d'un coup, à la demande explicite de Maxime.
 *
 * `entry_reference` sert de clé de déduplication entre deux synchros :
 * `transaction_id` est vérifié en direct comme toujours vide chez
 * BoursoBank, contrairement à `entry_reference`.
 */
export async function synchroniserTransactionsBancaires(): Promise<void> {
  const comptesLies = await db
    .select({ id: comptes.id, uid: comptes.enableBankingAccountId })
    .from(comptes)
    .where(isNotNull(comptes.enableBankingAccountId));

  await Promise.allSettled(
    comptesLies.map(async (compte) => {
      const uid = compte.uid!;

      const [derniere] = await db
        .select({ date: transactions.date })
        .from(transactions)
        .where(and(eq(transactions.compteId, compte.id), eq(transactions.source, "psd2")))
        .orderBy(desc(transactions.date))
        .limit(1);
      const dateDepuis = derniere?.date ?? DATE_DEMARRAGE_APPLICATION;

      const existantes = new Set(
        (
          await db
            .select({ ref: transactions.identifiantExterne })
            .from(transactions)
            .where(eq(transactions.compteId, compte.id))
        )
          .map((t) => t.ref)
          .filter((ref): ref is string => ref !== null),
      );

      // Certaines banques (Trade Republic, vérifié en direct) renvoient un
      // `continuation_key` qui n'avance jamais — la même page revient à
      // l'infini quel que soit ce qu'on leur redemande. Une borne dure évite
      // que la synchro tourne indéfiniment sur ce genre de réponse cassée ;
      // 20 pages (2000 transactions) couvre largement un usage normal.
      const MAX_PAGES = 20;
      let curseur: string | undefined;
      let page = 0;
      do {
        page++;
        const { transactions: lot, continuationKey } = await obtenirTransactionsBancaires(uid, EB_SANDBOX, {
          dateDepuis,
          continuationKey: curseur,
        });

        // Filtre défensif : certaines banques ignorent purement et
        // simplement `dateDepuis` et renvoient tout leur historique
        // disponible quel que soit ce qu'on demande (Trade Republic,
        // vérifié en direct) — on ne persiste jamais rien avant la date de
        // démarrage de l'application, peu importe ce que la banque renvoie.
        const nouvelles = lot.filter(
          (t) =>
            t.date &&
            t.date >= DATE_DEMARRAGE_APPLICATION &&
            t.identifiantExterne &&
            !existantes.has(t.identifiantExterne),
        );
        if (nouvelles.length > 0) {
          await db.insert(transactions).values(
            nouvelles.map((t) => ({
              compteId: compte.id,
              montant: String(t.montant),
              date: t.date!,
              commercant: t.libelle,
              source: "psd2",
              statut: "a_categoriser" as const,
              identifiantExterne: t.identifiantExterne,
            })),
          );
          for (const t of nouvelles) existantes.add(t.identifiantExterne!);
        }

        curseur = continuationKey ?? undefined;
      } while (curseur && page < MAX_PAGES);
    }),
  );
}

/**
 * Le Livret A n'est légalement pas un "compte de paiement" au sens DSP2
 * (art. 4(12) — vérifié via les Q&A EBA officiels) : aucun agrégateur DSP2,
 * BoursoBank compris, n'est tenu de le rendre accessible en lecture directe.
 * Solution retenue avec Maxime plutôt que de stocker son vrai mot de passe
 * bancaire chez un agrégateur tiers (webscraping, ce que fait Finary/Powens
 * pour ce type de compte) : puisque le Livret A n'est alimenté que par des
 * virements internes depuis son compte courant BoursoBank — eux bien visibles
 * en DSP2, avec le libellé "Livret A" en toutes lettres (vérifié sur son vrai
 * historique bancaire) — on détecte ces virements pour estimer le solde,
 * sans jamais avoir besoin d'accéder au Livret A lui-même.
 *
 * Chaque virement n'est appliqué qu'une fois (passage à `statut: "categorise"`,
 * avec une note explicite) — jamais recompté à la synchro suivante. Un point
 * d'historique est ajouté à `cours` à CHAQUE actualisation, même sans
 * virement détecté (solde inchangé) : comme pour les comptes DSP2, c'est ce
 * qui permet à la courbe d'évolution de se construire au fil du temps plutôt
 * que de rester vide entre deux mouvements réels.
 */
async function ajusterSoldeLivretA(): Promise<void> {
  const [compteCourant] = await db
    .select({ id: comptes.id })
    .from(comptes)
    .innerJoin(institutions, eq(institutions.id, comptes.institutionId))
    .where(and(eq(institutions.nom, "Boursorama Banque"), eq(comptes.libelle, "Compte courant")));
  const [compteLivretA] = await db
    .select({ id: comptes.id })
    .from(comptes)
    .innerJoin(institutions, eq(institutions.id, comptes.institutionId))
    .where(and(eq(institutions.nom, "Boursorama Banque"), eq(comptes.libelle, "Livret A")));
  if (!compteCourant || !compteLivretA) return;

  // Toute la lecture-calcul-écriture tourne dans une transaction avec verrou
  // sur la position (`for("update")`) : sans ça, deux actualisations qui se
  // chevauchent (double clic, retry réseau) peuvent chacune lire le même
  // solde de départ puis écraser le résultat de l'autre avec une valeur déjà
  // périmée — bug réellement observé (un virement marqué "traité" sans que
  // son effet sur le solde ait été conservé).
  await db.transaction(async (tx) => {
    const [positionLivretA] = await tx
      .select()
      .from(positions)
      .where(eq(positions.compteId, compteLivretA.id))
      .for("update");
    if (!positionLivretA) return; // Livret A pas encore créé dans l'app

    const mouvements = await tx
      .select({ id: transactions.id, montant: transactions.montant })
      .from(transactions)
      .where(
        and(
          eq(transactions.compteId, compteCourant.id),
          eq(transactions.statut, "a_categoriser"),
          ilike(transactions.commercant, "%livret a%"),
        ),
      );

    // Un débit du compte courant (montant < 0) part vers le Livret A (+) ;
    // un crédit (montant > 0) en revient (-) — signe inversé par rapport au
    // compte courant. Vaut 0 si aucun virement détecté depuis la dernière fois.
    const ajustement = mouvements.reduce((somme, m) => somme - Number(m.montant), 0);

    const [dernierCours] = await tx
      .select()
      .from(cours)
      .where(eq(cours.actifId, positionLivretA.actifId))
      .orderBy(desc(cours.horodatage))
      .limit(1);
    const soldeActuel = dernierCours ? Number(dernierCours.prix) : Number(positionLivretA.prixRevientMoyen ?? 0);
    const nouveauSolde = soldeActuel + ajustement;

    await tx.insert(cours).values({
      actifId: positionLivretA.actifId,
      horodatage: new Date(),
      prix: String(nouveauSolde),
      source: mouvements.length > 0 ? "estimation_virements" : "estimation_stable",
    });
    // Même sémantique que les autres comptes cash : le prix de revient suit
    // toujours le solde estimé, pour ne jamais afficher de faux gain/perte.
    await tx
      .update(positions)
      .set({ prixRevientMoyen: String(nouveauSolde) })
      .where(eq(positions.id, positionLivretA.id));

    if (mouvements.length > 0) {
      await tx
        .update(transactions)
        .set({ statut: "categorise", note: "Virement interne vers/depuis le Livret A — pris en compte automatiquement" })
        .where(
          inArray(
            transactions.id,
            mouvements.map((m) => m.id),
          ),
        );
    }
  });
}

/**
 * Photo du patrimoine par famille (`actifs.type`) ET par personne, prise à
 * chaque actualisation — construit au fil du temps l'historique nécessaire
 * au graphique d'évolution (patrimoine/graphique-repartition.tsx), filtrable
 * comme le reste de la page. Part de zéro à sa création : jamais reconstruite
 * rétroactivement depuis les cours déjà accumulés (décision de Maxime — un
 * historique fabriqué après coup serait faux, l'app n'ayant pas suivi le
 * patrimoine avant).
 */
async function enregistrerSnapshotPatrimoine(): Promise<void> {
  const [listePositions, listeActifsTous, listeCoursTous, listeComptesTous] = await Promise.all([
    db.select().from(positions),
    db.select().from(actifs),
    db.select().from(cours).orderBy(desc(cours.horodatage)),
    db.select().from(comptes),
  ]);

  const actifsParId = new Map(listeActifsTous.map((a) => [a.id, a]));
  const comptesParId = new Map(listeComptesTous.map((c) => [c.id, c]));
  const dernierCoursParActifId = new Map<string, (typeof listeCoursTous)[number]>();
  for (const c of listeCoursTous) {
    if (!dernierCoursParActifId.has(c.actifId)) dernierCoursParActifId.set(c.actifId, c);
  }

  const valeurParPersonneEtType = new Map<string, number>();
  for (const p of listePositions) {
    const actif = actifsParId.get(p.actifId);
    const compte = comptesParId.get(p.compteId);
    const dernierCours = actif ? dernierCoursParActifId.get(actif.id) : undefined;
    if (!actif || !compte || !dernierCours) continue;
    const valeur = Number(p.quantite) * Number(dernierCours.prix);
    const cle = `${compte.personneId}|${actif.type}`;
    valeurParPersonneEtType.set(cle, (valeurParPersonneEtType.get(cle) ?? 0) + valeur);
  }
  if (valeurParPersonneEtType.size === 0) return;

  const horodatage = new Date();
  await db.insert(historiquePatrimoine).values(
    [...valeurParPersonneEtType.entries()].map(([cle, valeur]) => {
      const [personneId, type] = cle.split("|");
      return { horodatage, personneId, type, valeur: valeur.toFixed(2) };
    }),
  );
}

/**
 * Un seul geste qui met tout à jour : synchronise Coinbase (crée/actualise/
 * retire des positions), rafraîchit le cours de tous les actifs ayant une
 * source automatique (dont les comptes bancaires DSP2), importe les
 * dernières transactions bancaires, et ré-enregistre l'historique complet
 * des métaux. Fusionné à la demande de Maxime — avoir un encart séparé pour
 * chaque connexion n'apportait rien de plus qu'un geste "tout actualiser"
 * unique.
 *
 * Les étapes indépendantes tournent en parallèle plutôt qu'en séquence — sur
 * un "tirer pour actualiser", chaque seconde compte : le solde du Livret A
 * dépend des transactions bancaires (doit attendre leur import), mais
 * l'historique des métaux, lui, ne dépend de rien d'autre.
 */
export async function actualiserCours() {
  await Promise.all([synchroniserSourcesMetaux(), synchroniserCoinbase().catch(() => null)]);
  const liste = await db.select().from(actifs);
  await Promise.all([
    Promise.allSettled(liste.map((a) => rafraichirCoursActif(a.id))),
    chargerHistoriqueMetaux().catch(() => null),
    synchroniserTransactionsBancaires()
      .catch(() => null)
      .then(() => ajusterSoldeLivretA().catch(() => null)),
  ]);
  await enregistrerSnapshotPatrimoine().catch(() => null);
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
 * - Le prix de revient moyen est calculé à partir de l'historique réel des
 *   transactions du compte (`calculerCoutBaseMoyen`, coût moyen pondéré) —
 *   jamais deviné, jamais laissé à 0. Recalculé à chaque synchronisation
 *   pour rester exact au fil des nouvelles récompenses de staking, qui
 *   diluent le coût moyen.
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

      if (prix === null) {
        // Prix indisponible (CoinGecko en panne ou limité) : jamais deviné,
        // donc jamais classé sous le seuil de poussière avec confiance. Une
        // position déjà connue est laissée intacte — marquée "présente" pour
        // ne pas être supprimée par le nettoyage plus bas — plutôt que
        // risquée d'être effacée par un simple aléa d'API ; un solde jamais
        // vu n'est en revanche pas créé sans savoir s'il vaut la peine de
        // l'afficher.
        if (actifExistant) {
          const [positionExistante] = await db
            .select({ id: positions.id })
            .from(positions)
            .where(and(eq(positions.compteId, compteCible.id), eq(positions.actifId, actifExistant.id)));
          if (positionExistante) {
            if (!presentsParCompte.has(compteCible.id)) presentsParCompte.set(compteCible.id, new Set());
            presentsParCompte.get(compteCible.id)!.add(actifExistant.id);
          }
        }
        ignores.push(solde.devise);
        continue;
      }

      const valeurEstimee = prix * solde.quantite;
      if (valeurEstimee < seuil) {
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

      // Coût de revient réel, calculé à partir de l'historique des
      // transactions Coinbase du (ou des, si comptes fusionnés) compte(s)
      // concerné(s) — jamais deviné. Un échec (API indisponible) ne doit pas
      // faire planter toute la synchro : on garde alors l'ancienne valeur
      // (mise à jour) ou on laisse vide (création).
      let prixRevientMoyen: number | null = null;
      try {
        const transactions = (
          await Promise.all(solde.comptesIds.map((id) => obtenirTransactionsCoinbase(id)))
        ).flat();
        prixRevientMoyen = calculerCoutBaseMoyen(transactions).coutUnitaire;
      } catch {
        prixRevientMoyen = null;
      }

      const [positionExistante] = await db
        .select()
        .from(positions)
        .where(and(eq(positions.compteId, compteCible.id), eq(positions.actifId, actif.id)));

      if (positionExistante) {
        await db
          .update(positions)
          .set({
            quantite: String(solde.quantite),
            updatedAt: new Date(),
            ...(prixRevientMoyen !== null ? { prixRevientMoyen: String(prixRevientMoyen) } : {}),
          })
          .where(eq(positions.id, positionExistante.id));
      } else {
        await db.insert(positions).values({
          compteId: compteCible.id,
          actifId: actif.id,
          quantite: String(solde.quantite),
          prixRevientMoyen: prixRevientMoyen !== null ? String(prixRevientMoyen) : null,
        });
      }

      await db.insert(cours).values({
        actifId: actif.id,
        horodatage: new Date(),
        prix: String(prix),
        source: "coingecko",
      });

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
