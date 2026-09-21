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

/**
 * Large éventail volontaire (une centaine) pour que créer une catégorie ne
 * tombe jamais en panne d'icône pertinente — demande explicite de Maxime
 * après avoir buté sur "Épargne". `value` est la clé stockée en base
 * (jamais renommée sans migration) ; le tracé réel vient de lucide-react
 * (src/lib/icones-categorie.tsx), pas dessiné à la main.
 */
export const ICONES_CATEGORIE = [
  // Alimentation
  { value: "courses", label: "Courses" },
  { value: "epicerie", label: "Épicerie" },
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
  { value: "bar", label: "Bar" },
  { value: "vin", label: "Vin" },
  { value: "fast_food", label: "Fast-food" },
  { value: "dessert", label: "Dessert" },
  { value: "boulangerie", label: "Boulangerie" },

  // Maison
  { value: "maison", label: "Maison" },
  { value: "loyer", label: "Loyer" },
  { value: "bricolage", label: "Bricolage" },
  { value: "outils", label: "Outils" },
  { value: "peinture", label: "Peinture" },
  { value: "electricite", label: "Électricité" },
  { value: "eau", label: "Eau" },
  { value: "gaz", label: "Gaz" },
  { value: "mobilier", label: "Mobilier" },
  { value: "literie", label: "Literie" },
  { value: "salle_de_bain", label: "Salle de bain" },
  { value: "jardin", label: "Jardin" },
  { value: "plantes", label: "Plantes" },
  { value: "arbres", label: "Arbres" },

  // Transport
  { value: "transport", label: "Transport" },
  { value: "essence", label: "Essence" },
  { value: "bus", label: "Bus" },
  { value: "train", label: "Train" },
  { value: "avion", label: "Avion" },
  { value: "velo", label: "Vélo" },
  { value: "parking", label: "Parking" },
  { value: "bateau", label: "Bateau" },
  { value: "camion", label: "Déménagement" },
  { value: "peage", label: "Péage" },

  // Vêtements & beauté
  { value: "vetements", label: "Vêtements" },
  { value: "chaussures", label: "Chaussures" },
  { value: "coiffeur", label: "Coiffeur" },
  { value: "bijoux", label: "Bijoux" },
  { value: "lunettes", label: "Lunettes" },
  { value: "montre", label: "Montre" },

  // Loisirs & culture
  { value: "loisirs", label: "Loisirs" },
  { value: "musique", label: "Musique" },
  { value: "cinema", label: "Cinéma" },
  { value: "lecture", label: "Lecture" },
  { value: "spectacle", label: "Spectacle" },
  { value: "jeux", label: "Jeux" },
  { value: "art", label: "Art" },
  { value: "photo", label: "Photo" },
  { value: "tele", label: "Télé" },
  { value: "podcast", label: "Podcast" },
  { value: "fete", label: "Fête" },
  { value: "concert", label: "Concert" },

  // Santé & bien-être
  { value: "sante", label: "Santé" },
  { value: "pharmacie", label: "Pharmacie" },
  { value: "medecin", label: "Médecin" },
  { value: "soins", label: "Soins" },
  { value: "sport", label: "Sport" },
  { value: "bienetre", label: "Bien-être" },
  { value: "mental", label: "Santé mentale" },

  // Abonnements & technologie
  { value: "abonnement", label: "Abonnement" },
  { value: "telephone", label: "Téléphone" },
  { value: "internet", label: "Internet" },
  { value: "informatique", label: "Informatique" },
  { value: "streaming", label: "Streaming" },
  { value: "presse", label: "Presse" },
  { value: "cloud", label: "Stockage en ligne" },

  // Énergie
  { value: "energie", label: "Énergie" },
  { value: "solaire", label: "Solaire" },
  { value: "batterie", label: "Batterie" },

  // Voyage
  { value: "voyage", label: "Voyage" },
  { value: "camping", label: "Camping" },
  { value: "montagne", label: "Montagne" },
  { value: "plage", label: "Plage" },
  { value: "monde", label: "International" },
  { value: "itineraire", label: "Itinéraire" },
  { value: "boussole", label: "Exploration" },

  // Cadeaux
  { value: "cadeau", label: "Cadeau" },

  // Épargne & finance
  { value: "epargne", label: "Épargne" },
  { value: "portefeuille", label: "Portefeuille" },
  { value: "carte_bancaire", label: "Carte bancaire" },
  { value: "pieces", label: "Pièces" },
  { value: "billets", label: "Billets" },
  { value: "investissement", label: "Investissement" },
  { value: "banque", label: "Banque" },
  { value: "don", label: "Don" },
  { value: "facture", label: "Facture" },

  // Éducation & enfants
  { value: "education", label: "Éducation" },
  { value: "fournitures", label: "Fournitures scolaires" },
  { value: "cartable", label: "Cartable" },
  { value: "bebe", label: "Bébé" },
  { value: "jouets", label: "Jouets" },

  // Animaux
  { value: "animaux", label: "Animaux" },
  { value: "chat", label: "Chat" },
  { value: "veterinaire", label: "Vétérinaire" },

  // Travail & administratif
  { value: "travail", label: "Travail" },
  { value: "documents", label: "Documents" },
  { value: "entreprise", label: "Entreprise" },
  { value: "courrier", label: "Courrier" },
  { value: "impression", label: "Impression" },
  { value: "impots", label: "Impôts" },

  // Sport
  { value: "natation", label: "Natation" },
  { value: "trophee", label: "Compétition" },
  { value: "cible", label: "Objectif" },

  // Divers
  { value: "assurance", label: "Assurance" },
  { value: "parapluie", label: "Imprévu" },
  { value: "etiquette", label: "Étiquette" },
  { value: "favori", label: "Favori" },
  { value: "autre", label: "Autre" },
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
