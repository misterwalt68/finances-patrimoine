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
  { value: "fonds", label: "Fonds / unité de compte" },
  { value: "immobilier", label: "Immobilier (parts)" },
  { value: "cash", label: "Cash" },
  { value: "autre", label: "Autre" },
] as const;

// Registre des adaptateurs de prix disponibles (SPEC.md §2 et §5.2).
// Ajouter un actif ne touche jamais cette liste ; ajouter une source, si.
export const SOURCES_PRIX = [
  { value: "coingecko", label: "CoinGecko" },
  { value: "twelvedata", label: "Twelve Data" },
  { value: "metaux", label: "Cours des métaux" },
  { value: "manuel", label: "Manuel" },
] as const;

/**
 * Les 5 métaux précieux/physiques que les particuliers détiennent en
 * général. Seul l'or a une source de prix gratuite sans clé (goldprice.dev,
 * cf. CONNEXIONS.md) — les autres sont en cours manuel jusqu'à ce qu'une
 * source gratuite équivalente existe ou qu'un compte payant soit créé.
 */
export const METAUX_PHYSIQUES = [
  { symbole: "XAU", libelle: "Or", sourcePrix: "metaux" },
  { symbole: "XAG", libelle: "Argent", sourcePrix: "manuel" },
  { symbole: "XPT", libelle: "Platine", sourcePrix: "manuel" },
  { symbole: "XPD", libelle: "Palladium", sourcePrix: "manuel" },
  { symbole: "XCU", libelle: "Cuivre", sourcePrix: "manuel" },
] as const;
