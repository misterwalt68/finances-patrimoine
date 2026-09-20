const formatEur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/**
 * Vue d'ensemble du mois : deux colonnes, revenus mensualisés (vert) contre
 * charges mensualisées (rouge) — les couleurs de statut de l'app, jamais
 * réutilisées pour autre chose. Le delta en dessous répond directement à
 * "est-ce que ça rentre plus que ça sort ce mois-ci".
 */
export function GraphiqueComparaisonMensuelle({ revenus, charges }: { revenus: number; charges: number }) {
  const max = Math.max(1, revenus, charges);
  const hauteurMax = 120;
  const delta = revenus - charges;

  return (
    <div>
      <div className="flex items-end justify-center gap-10" style={{ height: hauteurMax + 40 }}>
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-foreground">{formatEur(revenus)}</span>
          <div
            className="w-14 rounded-t-md bg-positive"
            style={{ height: Math.max(4, (revenus / max) * hauteurMax) }}
          />
          <span className="text-xs text-muted">Revenus</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-foreground">{formatEur(charges)}</span>
          <div
            className="w-14 rounded-t-md bg-negative"
            style={{ height: Math.max(4, (charges / max) * hauteurMax) }}
          />
          <span className="text-xs text-muted">Charges</span>
        </div>
      </div>
      <p className="mt-3 text-center text-sm">
        <span className="text-muted">Reste chaque mois </span>
        <span className={delta >= 0 ? "text-positive" : "text-negative"}>
          {delta >= 0 ? "+" : ""}
          {formatEur(delta)}
        </span>
      </p>
    </div>
  );
}
