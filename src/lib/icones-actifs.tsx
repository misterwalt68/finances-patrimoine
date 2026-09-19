import type { ReactNode } from "react";

/**
 * Couleurs représentatives des métaux (identité visuelle, pas un encodage
 * de données — la palette catégorielle de la compétence dataviz ne
 * s'applique qu'aux graphiques comme le camembert).
 */
const COULEURS_METAUX: Record<string, string> = {
  XAU: "#D4AF37", // or
  XAG: "#C7CDD1", // argent
  XPT: "#B9C4C9", // platine
  XPD: "#CED4D8", // palladium
  XCU: "#B5651D", // cuivre
};

/** Symboles monétaires réels (pas des logos de marque) sur fond coloré. */
const INFOS_CRYPTO: Record<string, { symbole: string; couleur: string }> = {
  BTC: { symbole: "₿", couleur: "#F7931A" },
  ETH: { symbole: "Ξ", couleur: "#627EEA" },
  ADA: { symbole: "₳", couleur: "#0033AD" },
};

export function couleurMetal(symbole: string): string {
  return COULEURS_METAUX[symbole] ?? "#9a9a9a";
}

export function IconeMetal({ symbole, className }: { symbole: string; className?: string }) {
  const couleur = couleurMetal(symbole);
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-[3px] ${className ?? "h-3.5 w-5"}`}
      style={{ backgroundColor: couleur, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)" }}
    />
  );
}

export function IconeCrypto({ code, className }: { code: string; className?: string }) {
  const info = INFOS_CRYPTO[code];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none ${className ?? "h-5 w-5"}`}
      style={{ backgroundColor: info?.couleur ?? "#8b8f97", color: "#0b0c0e" }}
    >
      {info?.symbole ?? code.slice(0, 1).toUpperCase()}
    </span>
  );
}

// Couleur de repli de la famille "cash" dans le camembert (src/app/
// patrimoine/camembert.tsx), utilisée seulement quand aucun logo de banque
// n'est disponible pour ce compte.
export const COULEUR_BANQUE = "#9085e9";

/** Vrais logos de banque, un par établissement DSP2 connu (public/logos/). */
const LOGOS_BANQUE: Record<string, string> = {
  boursobank: "/logos/boursobank.png",
  trade_republic: "/logos/trade-republic.png",
};

export function IconeBanque({ identifiantExterne, className }: { identifiantExterne?: string | null; className?: string }) {
  const logo = identifiantExterne ? LOGOS_BANQUE[identifiantExterne] : undefined;

  if (logo) {
    // Badge blanc rond (les logos fournis ont un fond blanc plein, pas
    // transparent) : `object-contain` centre le mark sans le rogner, quel
    // que soit le format d'origine de chaque logo.
    return (
      <span
        aria-hidden
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5 ${className ?? "h-5 w-5"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- icône 20px, next/image serait disproportionné */}
        <img src={logo} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className ?? "h-5 w-5"}`}
      style={{ backgroundColor: COULEUR_BANQUE }}
    >
      <svg viewBox="0 0 24 24" fill="#0b0c0e" className="h-3 w-3">
        <polygon points="12,2 22,8 2,8" />
        <rect x="4" y="9" width="2" height="9" />
        <rect x="8" y="9" width="2" height="9" />
        <rect x="12" y="9" width="2" height="9" />
        <rect x="16" y="9" width="2" height="9" />
        <rect x="2" y="19" width="20" height="2" />
      </svg>
    </span>
  );
}

/** Choisit la bonne icône selon le type et le symbole externe de l'actif. */
export function IconeActif({
  type,
  identifiantExterne,
}: {
  type?: string;
  identifiantExterne?: string | null;
}): ReactNode {
  if (type === "metal" && identifiantExterne) return <IconeMetal symbole={identifiantExterne} />;
  if (type === "crypto" && identifiantExterne) return <IconeCrypto code={identifiantExterne} />;
  if (type === "cash") return <IconeBanque identifiantExterne={identifiantExterne} />;
  return null;
}
