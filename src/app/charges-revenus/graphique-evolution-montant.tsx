export type PointMontant = { dateEffet: string; montant: number };

const formatEur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

const LARGEUR = 320;
const HAUTEUR = 120;
const MARGE = { haut: 24, bas: 24, gauche: 12, droite: 12 };

/**
 * Évolution d'un montant dans le temps (ex. la taxe foncière qui augmente
 * chaque année) — peu de points attendus (une poignée de mises à jour sur
 * plusieurs années), donc chaque point garde sa valeur affichée en direct
 * plutôt qu'un survol : c'est justement le nombre qui doit sauter aux yeux,
 * pas une tendance dense.
 */
export function GraphiqueEvolutionMontant({ points }: { points: PointMontant[] }) {
  const tries = [...points].sort((a, b) => a.dateEffet.localeCompare(b.dateEffet));

  if (tries.length < 2) {
    return (
      <p className="py-4 text-center text-sm text-muted">
        Un seul montant pour l&apos;instant — l&apos;évolution apparaîtra après une mise à jour.
      </p>
    );
  }

  const valeurs = tries.map((p) => p.montant);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const plage = max - min || 1;

  const largeurDispo = LARGEUR - MARGE.gauche - MARGE.droite;
  const hauteurDispo = HAUTEUR - MARGE.haut - MARGE.bas;
  const x = (i: number) => MARGE.gauche + (tries.length > 1 ? (i / (tries.length - 1)) * largeurDispo : 0);
  const y = (v: number) => MARGE.haut + hauteurDispo - ((v - min) / plage) * hauteurDispo;

  const chemin = tries.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.montant)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} className="w-full" preserveAspectRatio="none">
      <path d={chemin} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {tries.map((p, i) => (
        <g key={p.dateEffet + i}>
          <circle cx={x(i)} cy={y(p.montant)} r={3.5} fill="var(--accent)" />
          <text x={x(i)} y={y(p.montant) - 10} fontSize="10" fill="var(--foreground)" textAnchor="middle">
            {formatEur(p.montant)}
          </text>
          <text x={x(i)} y={HAUTEUR - 4} fontSize="9" fill="var(--muted)" textAnchor="middle">
            {formatDate(p.dateEffet)}
          </text>
        </g>
      ))}
    </svg>
  );
}
