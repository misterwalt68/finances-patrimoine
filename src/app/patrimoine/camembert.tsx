import { TYPES_ACTIF } from "@/lib/constants";

// Palette catégorielle (mode sombre) — ordre fixe par type d'actif, jamais
// réassigné selon ce qui est affiché. Cf. compétence dataviz : "color
// follows the entity, never its rank".
export const COULEURS_PAR_TYPE: Record<string, string> = {
  action: "#3987e5",
  etf: "#d95926",
  crypto: "#199e70",
  metal: "#c98500",
  fonds: "#d55181",
  immobilier: "#008300",
  cash: "#9085e9",
  autre: "#e66767",
};

const libelleType = (type: string) => TYPES_ACTIF.find((t) => t.value === type)?.label ?? type;

const formatEur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function CamembertAllocation({
  groupes,
}: {
  groupes: { type: string; valeur: number }[];
}) {
  const total = groupes.reduce((s, g) => s + g.valeur, 0);
  if (total <= 0) return null;

  const rayon = 80;
  const epaisseur = 28;
  const circonference = 2 * Math.PI * rayon;
  const espace = 3; // gap visuel entre segments, en unités de circonférence

  const segments = groupes
    .filter((g) => g.valeur > 0)
    .reduce<{ decalage: number; items: Array<{
      type: string;
      valeur: number;
      part: number;
      couleur: string;
      dasharray: string;
      dashoffset: number;
    }> }>(
      (acc, g) => {
        const part = g.valeur / total;
        const longueur = Math.max(part * circonference - espace, 0);
        acc.items.push({
          type: g.type,
          valeur: g.valeur,
          part,
          couleur: COULEURS_PAR_TYPE[g.type] ?? "#898781",
          dasharray: `${longueur} ${circonference - longueur}`,
          dashoffset: -acc.decalage,
        });
        return { decalage: acc.decalage + part * circonference, items: acc.items };
      },
      { decalage: 0, items: [] },
    ).items;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 200 200" className="h-40 w-40 shrink-0 -rotate-90">
        <circle cx="100" cy="100" r={rayon} fill="none" stroke="var(--line)" strokeWidth={epaisseur} />
        {segments.map((s) => (
          <circle
            key={s.type}
            cx="100"
            cy="100"
            r={rayon}
            fill="none"
            stroke={s.couleur}
            strokeWidth={epaisseur}
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
            strokeLinecap="round"
          />
        ))}
      </svg>

      <ul className="min-w-0 flex-1 space-y-2.5">
        {segments.map((s) => (
          <li key={s.type} className="text-sm">
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.couleur }}
              />
              <span className="text-foreground">{libelleType(s.type)}</span>
            </span>
            <span className="pl-[18px] text-muted">
              {Math.round(s.part * 100)}% · {formatEur(s.valeur)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
