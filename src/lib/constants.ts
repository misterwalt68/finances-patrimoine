/**
 * Discriminants techniques (sélectionnent un chemin de code : adaptateur de
 * prix, méthode de synchronisation…) — pas de la donnée métier. Voir la note
 * en tête de src/db/schema.ts. Tout le reste (établissements, actifs,
 * enveloppes, catégories, personnes) est créé depuis l'interface.
 */

export const TYPES_INSTITUTION = [
  { value: "banque", label: "Banque" },
  { value: "courtier", label: "Courtier" },
  { value: "assureur", label: "Assureur" },
  { value: "plateforme_crypto", label: "Plateforme crypto" },
  { value: "autre", label: "Autre" },
] as const;

export const METHODES_CONNEXION = [
  { value: "psd2", label: "DSP2 (automatique)" },
  { value: "api", label: "API (lecture seule)" },
  { value: "email", label: "Email (avis parsés par IA)" },
  { value: "manuel", label: "Manuel" },
] as const;

export const TYPES_ACTIF = [
  { value: "action", label: "Action" },
  { value: "etf", label: "ETF" },
  { value: "crypto", label: "Crypto" },
  { value: "metal", label: "Métal" },
  { value: "fonds", label: "Bourse" },
  { value: "immobilier", label: "Immobilier (parts)" },
  { value: "cash", label: "Cash" },
  { value: "securite", label: "Matelas de sécurité" },
  { value: "autre", label: "Autre" },
] as const;

// Registre des adaptateurs de prix disponibles (SPEC.md §2 et §5.2).
// Ajouter un actif ne touche jamais cette liste ; ajouter une source, si.
export const SOURCES_PRIX = [
  { value: "coingecko", label: "CoinGecko" },
  { value: "twelvedata", label: "Twelve Data" },
  { value: "metaux", label: "Cours des métaux" },
  { value: "enable_banking", label: "Enable Banking (DSP2)" },
  { value: "manuel", label: "Manuel" },
] as const;

export const TYPES_CHARGE_REVENU = [
  { value: "revenu", label: "Revenu" },
  { value: "charge", label: "Charge" },
] as const;

export const PERIODICITES_CHARGE = [
  { value: "mensuel", label: "Mensuel" },
  { value: "annuel", label: "Annuel" },
] as const;

/**
 * Les 5 métaux précieux/physiques que les particuliers détiennent en
 * général. Tous ont désormais une source de prix gratuite sans clé — l'or
 * via goldprice.dev (cours au comptant réel), les autres via les contrats à
 * terme Yahoo Finance (cf. src/lib/pricing/adaptateurs/metaux.ts) : ce
 * dernier n'existait pas au tout début du projet, goldprice.dev réservant
 * argent/platine/palladium/cuivre à son palier payant (vérifié en direct).
 */
export const METAUX_PHYSIQUES = [
  { symbole: "XAU", libelle: "Or", sourcePrix: "metaux" },
  { symbole: "XAG", libelle: "Argent", sourcePrix: "metaux" },
  { symbole: "XPT", libelle: "Platine", sourcePrix: "metaux" },
  { symbole: "XPD", libelle: "Palladium", sourcePrix: "metaux" },
  { symbole: "XCU", libelle: "Cuivre", sourcePrix: "metaux" },
] as const;
