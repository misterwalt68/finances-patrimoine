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

export function IconeMetal({ symbole, className }: { symbole: string; className?: string }) {
  const couleur = COULEURS_METAUX[symbole] ?? "#9a9a9a";
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
  return null;
}
