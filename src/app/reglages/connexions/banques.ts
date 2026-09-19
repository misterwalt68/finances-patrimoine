/**
 * Banques réellement connectables en production, telles que déclarées côté
 * Enable Banking (nom exact de l'ASPSP, vérifié via GET /aspsps). En dev,
 * tout le monde pointe vers "Mock ASPSP" (EB_SANDBOX) — jamais de vraies
 * données touchées pendant le développement.
 */
export const ASPSP_PAR_BANQUE = {
  boursobank: { label: "BoursoBank", nom: "Boursorama Banque", pays: "FR" },
  trade_republic: { label: "Trade Republic", nom: "Trade Republic", pays: "FR" },
} satisfies Record<string, { label: string; nom: string; pays: string }>;

export type CleBanque = keyof typeof ASPSP_PAR_BANQUE;
