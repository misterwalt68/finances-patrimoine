import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  date,
  boolean,
  integer,
  jsonb,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * Règle d'architecture n°1 (SPEC.md §2) : aucune valeur métier n'est codée en dur.
 * Les champs `type`/`source`/`statut` ci-dessous sont des discriminants TECHNIQUES
 * (ils sélectionnent un chemin de code : adaptateur de prix, écran, calcul) — pas des
 * données métier éditables. Ils sont volontairement stockés en `text` (pas en `pgEnum`
 * Postgres) pour qu'ajouter une valeur ne demande jamais de migration de type, seulement
 * une constante TypeScript documentée à côté de son usage. Tout le reste (établissements,
 * actifs, enveloppes, catégories, personnes, biens) vit dans des tables de référence
 * éditables depuis l'interface, sans aucun enum.
 */

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// --- Référentiel foyer -------------------------------------------------

export const personnes = pgTable("personnes", {
  id: id(),
  libelle: text("libelle").notNull(), // "Maxime", "Amélie", "Couple", enfants à venir…
  createdAt: createdAt(),
});

// --- Établissements et comptes ------------------------------------------

export const institutions = pgTable("institutions", {
  id: id(),
  nom: text("nom").notNull(),
  type: text("type").notNull(), // banque | courtier | assureur | plateforme_crypto | autre
  methodeConnexion: text("methode_connexion").notNull(), // psd2 | api | email | manuel
  consentementEtat: text("consentement_etat"), // actif | expire | revoque | absent
  consentementExpireLe: date("consentement_expire_le"),
  // Identifiant de session Enable Banking (DSP2) — permet de relire les
  // comptes/soldes/transactions sans repasser par le consentement tant
  // qu'il est valide.
  enableBankingSessionId: text("enable_banking_session_id"),
  // Liste brute des comptes renvoyés par Enable Banking au moment du
  // consentement (uid/nom/IBAN/devise) — Enable Banking ne redonne plus ces
  // détails après coup (seulement les uid), donc conservés ici pour pouvoir
  // les proposer au rattachement à un vrai `compte` depuis les réglages.
  enableBankingComptes: jsonb("enable_banking_comptes"),
  createdAt: createdAt(),
});

export const enveloppes = pgTable("enveloppes", {
  id: id(),
  libelle: text("libelle").notNull(), // PEA, PER, AV, Livret A, CTO, compte courant…
  fiscaliteDescription: text("fiscalite_description"),
  plafond: numeric("plafond", { precision: 14, scale: 2 }),
  dureeMaturiteMois: integer("duree_maturite_mois"),
  liquidite: text("liquidite"), // immediate | courte | longue — libre, éditable
  createdAt: createdAt(),
});

export const comptes = pgTable("comptes", {
  id: id(),
  institutionId: uuid("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "restrict" }),
  personneId: uuid("personne_id")
    .notNull()
    .references(() => personnes.id, { onDelete: "restrict" }),
  enveloppeId: uuid("enveloppe_id")
    .notNull()
    .references(() => enveloppes.id, { onDelete: "restrict" }),
  libelle: text("libelle").notNull(),
  devise: text("devise").notNull().default("EUR"),
  dateOuverture: date("date_ouverture"),
  actif: boolean("actif").notNull().default(true),
  // Rattachement à la connexion DSP2 Enable Banking, quand applicable.
  enableBankingAccountId: text("enable_banking_account_id"),
  createdAt: createdAt(),
});

// --- Actifs, positions, cours -------------------------------------------

export const actifs = pgTable("actifs", {
  id: id(),
  libelle: text("libelle").notNull(),
  type: text("type").notNull(), // action | etf | crypto | metal | fonds | immobilier | cash | autre
  identifiantExterne: text("identifiant_externe"), // ISIN, ticker, symbole…
  devise: text("devise").notNull().default("EUR"),
  sourcePrix: text("source_prix").notNull(), // clé du registre d'adaptateurs : coingecko | twelvedata | metaux | manuel…
  identifiantSource: text("identifiant_source"), // identifiant de l'actif dans cette source
  createdAt: createdAt(),
});

export const positions = pgTable("positions", {
  id: id(),
  compteId: uuid("compte_id")
    .notNull()
    .references(() => comptes.id, { onDelete: "cascade" }),
  actifId: uuid("actif_id")
    .notNull()
    .references(() => actifs.id, { onDelete: "restrict" }),
  // La quantité est la vérité ; la valeur est toujours calculée, jamais stockée (SPEC §4).
  quantite: numeric("quantite", { precision: 24, scale: 8 }).notNull(),
  prixRevientMoyen: numeric("prix_revient_moyen", { precision: 14, scale: 4 }),
  // Description libre (ex. "Lingotin 50g", "Pièce Napoléon") — utile pour
  // distinguer plusieurs positions du même actif sur le même compte (or
  // physique notamment, où chaque pièce/lingot est un achat séparé).
  note: text("note"),
  // Approximation simple de la date d'achat pour suivre l'évolution dans le
  // temps sans devoir saisir un mouvement complet (utile pour l'or physique,
  // où il n'y a rien de numérique pour capter automatiquement la date).
  dateAcquisition: date("date_acquisition"),
  provisoire: boolean("provisoire").notNull().default(false),
  updatedAt: updatedAt(),
});

export const cours = pgTable("cours", {
  id: id(),
  actifId: uuid("actif_id")
    .notNull()
    .references(() => actifs.id, { onDelete: "cascade" }),
  horodatage: timestamp("horodatage", { withTimezone: true }).notNull(),
  prix: numeric("prix", { precision: 18, scale: 6 }).notNull(),
  source: text("source").notNull(),
  createdAt: createdAt(),
});

/**
 * Photo du patrimoine par famille (`actifs.type`) ET par personne, prise à
 * chaque actualisation — sert à tracer l'évolution du portefeuille dans le
 * temps (graphique en barres empilées, patrimoine/graphique-repartition.tsx),
 * filtrable comme le reste de la page (Maxime / Amélie / Couple = somme des
 * trois). Part de zéro à sa création (décision de Maxime) : jamais
 * reconstruite rétroactivement depuis l'historique déjà accumulé dans `cours`.
 */
export const historiquePatrimoine = pgTable("historique_patrimoine", {
  id: id(),
  horodatage: timestamp("horodatage", { withTimezone: true }).notNull(),
  personneId: uuid("personne_id")
    .notNull()
    .references(() => personnes.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  valeur: numeric("valeur", { precision: 14, scale: 2 }).notNull(),
  createdAt: createdAt(),
});

export const mouvements = pgTable("mouvements", {
  id: id(),
  compteId: uuid("compte_id")
    .notNull()
    .references(() => comptes.id, { onDelete: "cascade" }),
  actifId: uuid("actif_id").references(() => actifs.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(), // achat | vente | apport | retrait | dividende | interet | frais | impot
  quantite: numeric("quantite", { precision: 24, scale: 8 }),
  montant: numeric("montant", { precision: 14, scale: 2 }).notNull(),
  date: date("date").notNull(),
  source: text("source").notNull(), // psd2 | email | manuel | estime
  niveauConfiance: text("niveau_confiance").notNull().default("confirme"), // confirme | estime
  createdAt: createdAt(),
});

export const plansInvestissement = pgTable("plans_investissement", {
  id: id(),
  compteId: uuid("compte_id")
    .notNull()
    .references(() => comptes.id, { onDelete: "cascade" }),
  actifId: uuid("actif_id")
    .notNull()
    .references(() => actifs.id, { onDelete: "restrict" }),
  montant: numeric("montant", { precision: 14, scale: 2 }).notNull(),
  periodicite: text("periodicite").notNull(), // mensuel | hebdomadaire | trimestriel — libre
  jourExecution: integer("jour_execution"),
  dateDebut: date("date_debut").notNull(),
  dateFin: date("date_fin"),
  actif: boolean("actif").notNull().default(true),
  createdAt: createdAt(),
});

// --- Charges et revenus fixes (budget) -----------------------------------

/**
 * Registre déclaratif des revenus et charges récurrents connus à l'avance
 * (salaire, loyer perçu, crédit, eau, électricité, abonnements…) — distinct
 * du suivi précis des dépenses quotidiennes (`transactions`, branché en
 * DSP2). Le montant n'est volontairement pas ici : voir
 * `chargesRevenusHistorique`, pour suivre son évolution dans le temps (ex.
 * la taxe foncière qui augmente chaque année) sans perdre les valeurs
 * précédentes. Sert aussi de pense-bête pratique (fournisseur, numéro
 * client, lien de suivi) — c'est la zone "pilotage", pas la zone "données".
 */
export const chargesRevenus = pgTable("charges_revenus", {
  id: id(),
  type: text("type").notNull(), // revenu | charge
  libelle: text("libelle").notNull(),
  periodicite: text("periodicite").notNull(), // mensuel | annuel
  personneId: uuid("personne_id")
    .notNull()
    .references(() => personnes.id, { onDelete: "restrict" }),
  fournisseur: text("fournisseur"),
  numeroClient: text("numero_client"),
  lienSuivi: text("lien_suivi"),
  note: text("note"),
  createdAt: createdAt(),
});

export const chargesRevenusHistorique = pgTable("charges_revenus_historique", {
  id: id(),
  chargeRevenuId: uuid("charge_revenu_id")
    .notNull()
    .references(() => chargesRevenus.id, { onDelete: "cascade" }),
  montant: numeric("montant", { precision: 12, scale: 2 }).notNull(),
  dateEffet: date("date_effet").notNull(),
  createdAt: createdAt(),
});

// --- Dépenses et revenus du quotidien ------------------------------------

export const categories = pgTable("categories", {
  id: id(),
  libelle: text("libelle").notNull(),
  // Discriminant technique (clé dans ICONES_CATEGORIE, src/lib/constants.ts)
  // — sélectionne juste un pictogramme, jamais la catégorie elle-même (qui
  // reste un libellé libre créé depuis l'interface).
  icone: text("icone"),
  // revenu | charge — une catégorie sert soit à ranger des gains, soit des
  // dépenses, jamais les deux (évite qu'une catégorie de dépense apparaisse
  // proposée pour trier un virement entrant, et inversement).
  type: text("type").notNull().default("charge"),
  parentId: uuid("parent_id").references(
    (): AnyPgColumn => categories.id,
    { onDelete: "set null" },
  ),
  createdAt: createdAt(),
});

export const transactions = pgTable("transactions", {
  id: id(),
  compteId: uuid("compte_id").references(() => comptes.id, {
    onDelete: "set null",
  }),
  personneId: uuid("personne_id").references(() => personnes.id, {
    onDelete: "set null",
  }),
  categorieId: uuid("categorie_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  montant: numeric("montant", { precision: 14, scale: 2 }).notNull(),
  date: date("date").notNull(),
  commercant: text("commercant"),
  note: text("note"),
  pieceJointeUrl: text("piece_jointe_url"),
  recurrent: boolean("recurrent").notNull().default(false),
  source: text("source").notNull(), // psd2 | raccourci_dictee | raccourci_photo | raccourci_manuel | manuel
  statut: text("statut").notNull().default("a_categoriser"), // a_categoriser | categorise
  // Référence renvoyée par la source externe (ex. entry_reference Enable
  // Banking) — sert uniquement à ne pas réimporter deux fois la même
  // transaction bancaire à chaque synchronisation, jamais affiché.
  identifiantExterne: text("identifiant_externe"),
  createdAt: createdAt(),
});

export const reglesCategorisation = pgTable("regles_categorisation", {
  id: id(),
  motifLibelle: text("motif_libelle"),
  commercant: text("commercant"),
  categorieId: uuid("categorie_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  personneDefautId: uuid("personne_defaut_id").references(
    () => personnes.id,
    { onDelete: "set null" },
  ),
  createdAt: createdAt(),
});

// --- Immobilier -----------------------------------------------------------

export const biens = pgTable("biens", {
  id: id(),
  libelle: text("libelle").notNull(),
  valeurEstimee: numeric("valeur_estimee", { precision: 14, scale: 2 }),
  valeurEstimeeMiseAJourLe: date("valeur_estimee_mise_a_jour_le"),
  regimeFiscal: text("regime_fiscal"),
  createdAt: createdAt(),
});

// Quote-part de détention d'un bien par personne (pourcentage) — permet
// la détention indirecte (SCI à plusieurs associés) sans rien coder en dur.
export const biensDetentions = pgTable(
  "biens_detentions",
  {
    bienId: uuid("bien_id")
      .notNull()
      .references(() => biens.id, { onDelete: "cascade" }),
    personneId: uuid("personne_id")
      .notNull()
      .references(() => personnes.id, { onDelete: "cascade" }),
    quotePart: numeric("quote_part", { precision: 5, scale: 2 }).notNull(), // en %
  },
  (table) => [primaryKey({ columns: [table.bienId, table.personneId] })],
);

export const credits = pgTable("credits", {
  id: id(),
  bienId: uuid("bien_id")
    .notNull()
    .references(() => biens.id, { onDelete: "cascade" }),
  capitalRestantDu: numeric("capital_restant_du", { precision: 14, scale: 2 }).notNull(),
  taux: numeric("taux", { precision: 6, scale: 4 }),
  mensualite: numeric("mensualite", { precision: 10, scale: 2 }),
  dateFin: date("date_fin"),
  createdAt: createdAt(),
});

// --- Objectifs et décisions -------------------------------------------

export const objectifs = pgTable("objectifs", {
  id: id(),
  libelle: text("libelle").notNull(),
  montantCible: numeric("montant_cible", { precision: 14, scale: 2 }),
  echeance: date("echeance"),
  createdAt: createdAt(),
});

export const decisions = pgTable("decisions", {
  id: id(),
  date: date("date").notNull(),
  description: text("description").notNull(),
  montant: numeric("montant", { precision: 14, scale: 2 }),
  raisonnement: text("raisonnement"),
  dateRelectureProgrammee: date("date_relecture_programmee"),
  createdAt: createdAt(),
});

// --- Fiscalité et paramètres --------------------------------------------

// Versionné par date d'effet : jamais de plafond/abattement en constante (SPEC §2).
export const reglesFiscales = pgTable("regles_fiscales", {
  id: id(),
  cle: text("cle").notNull(), // ex: "plafond_livret_a", "duree_maturite_pea"
  valeur: jsonb("valeur").notNull(),
  dateEffet: date("date_effet").notNull(),
  createdAt: createdAt(),
});

export const parametres = pgTable("parametres", {
  cle: text("cle").primaryKey(), // ex: "tmi", "allocation_cible", "seuils_alerte"
  valeur: jsonb("valeur").notNull(),
  updatedAt: updatedAt(),
});

// --- Audit ------------------------------------------------------------

// Journal d'audit des synchronisations et des erreurs (SPEC §10).
export const journalAudit = pgTable("journal_audit", {
  id: id(),
  evenement: text("evenement").notNull(), // ex: "sync_psd2", "sync_cours", "webhook_raccourci"
  niveau: text("niveau").notNull().default("info"), // info | warning | erreur
  details: jsonb("details"),
  createdAt: createdAt(),
});

export const schema = {
  personnes,
  institutions,
  enveloppes,
  comptes,
  actifs,
  positions,
  cours,
  historiquePatrimoine,
  chargesRevenus,
  chargesRevenusHistorique,
  mouvements,
  plansInvestissement,
  categories,
  transactions,
  reglesCategorisation,
  biens,
  biensDetentions,
  credits,
  objectifs,
  decisions,
  reglesFiscales,
  parametres,
  journalAudit,
};
