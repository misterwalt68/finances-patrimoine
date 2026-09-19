/**
 * Registre des intégrations externes connues, pour l'écran Réglages →
 * Connexions. Discriminant technique (comme src/lib/constants.ts) : ça
 * sélectionne quelles variables d'environnement vérifier, ce n'est pas de la
 * donnée métier créable depuis l'interface.
 */
export type DefinitionConnexion = {
  cle: string;
  nom: string;
  variablesRequises: string[];
};

export const CONNEXIONS_CONNUES: DefinitionConnexion[] = [
  {
    cle: "supabase",
    nom: "Supabase",
    variablesRequises: [
      "DATABASE_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SECRET_KEY",
    ],
  },
  {
    cle: "coinbase",
    nom: "Coinbase",
    variablesRequises: ["COINBASE_CDP_KEY_NAME", "COINBASE_CDP_PRIVATE_KEY"],
  },
  {
    cle: "enable_banking",
    nom: "Enable Banking (DSP2)",
    variablesRequises: ["ENABLE_BANKING_APPLICATION_ID", "ENABLE_BANKING_PRIVATE_KEY"],
  },
  {
    cle: "twelvedata",
    nom: "Twelve Data",
    variablesRequises: ["TWELVEDATA_API_KEY"],
  },
  {
    cle: "metaux",
    nom: "Cours des métaux",
    variablesRequises: ["METALS_API_KEY"],
  },
  {
    cle: "anthropic",
    nom: "Anthropic (IA)",
    variablesRequises: ["ANTHROPIC_API_KEY"],
  },
];

export function statutConnexion(def: DefinitionConnexion): boolean {
  return def.variablesRequises.every((v) => Boolean(process.env[v]?.trim()));
}
