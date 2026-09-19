"use client";

import { useActionState, useMemo, useState } from "react";
import { IconeMetal } from "@/lib/icones-actifs";
import { chargerHistoriqueOr, type EtatHistoriqueOr } from "./actions";

export type PointCours = { date: string; prix: number };
export type MetalGraphique = { actifId: string; libelle: string; symbole: string; automatique: boolean };
export type AchatMetal = { date: string; prix: number; note: string | null };

const PLAGES = [
  { valeur: "semaine", label: "1 semaine", jours: 7 },
  { valeur: "mois", label: "1 mois", jours: 30 },
  { valeur: "an", label: "1 an", jours: 365 },
  { valeur: "decennie", label: "10 ans", jours: 3650 },
  { valeur: "toujours", label: "Toujours", jours: Infinity },
] as const;

const formatPrix = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

const formatDateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

const LARGEUR = 600;
const HAUTEUR = 180;
const MARGE = { haut: 12, bas: 22, gauche: 4, droite: 4 };

export function GraphiqueHistoriqueMetal({
  metaux,
  coursParActif,
  achatsParActif,
}: {
  metaux: MetalGraphique[];
  coursParActif: Record<string, PointCours[]>;
  achatsParActif: Record<string, AchatMetal[]>;
}) {
  const [metalId, setMetalId] = useState(metaux[0]?.actifId ?? "");
  const [plage, setPlage] = useState<(typeof PLAGES)[number]["valeur"]>("mois");
  // Lu une seule fois (initialiseur paresseux) : Date.now() est impur et ne
  // doit pas être appelé directement pendant le rendu.
  const [maintenant] = useState(() => Date.now());

  const [etat, lancer, enCours] = useActionState(
    async () => chargerHistoriqueOr(),
    { statut: "repos" } as EtatHistoriqueOr,
  );

  const metal = metaux.find((m) => m.actifId === metalId);
  const joursPlage = PLAGES.find((p) => p.valeur === plage)!.jours;
  const seuil = Number.isFinite(joursPlage) ? maintenant - joursPlage * 24 * 60 * 60 * 1000 : -Infinity;

  const points = useMemo(() => {
    return (coursParActif[metalId] ?? [])
      .map((p) => ({ date: new Date(p.date), prix: p.prix }))
      .filter((p) => p.date.getTime() >= seuil)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [coursParActif, metalId, seuil]);

  const achats = useMemo(() => {
    return (achatsParActif[metalId] ?? [])
      .map((a) => ({ ...a, date: new Date(a.date) }))
      .filter((a) => a.date.getTime() >= seuil);
  }, [achatsParActif, metalId, seuil]);

  const graphique = useMemo(() => {
    if (points.length < 2) return null;
    const dates = points.map((p) => p.date.getTime());
    const prix = points.map((p) => p.prix);
    const achatsPrix = achats.map((a) => a.prix);
    const xMin = Math.min(...dates);
    const xMax = Math.max(...dates);
    const yMin = Math.min(...prix, ...achatsPrix);
    const yMax = Math.max(...prix, ...achatsPrix);
    const yPad = (yMax - yMin) * 0.1 || 1;

    const x = (t: number) =>
      MARGE.gauche + ((t - xMin) / (xMax - xMin || 1)) * (LARGEUR - MARGE.gauche - MARGE.droite);
    const y = (p: number) =>
      HAUTEUR -
      MARGE.bas -
      ((p - (yMin - yPad)) / (yMax + yPad - (yMin - yPad) || 1)) * (HAUTEUR - MARGE.haut - MARGE.bas);

    const chemin = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date.getTime())},${y(p.prix)}`).join(" ");

    return { x, y, chemin, xMin, xMax };
  }, [points, achats]);

  return (
    <div className="border-b border-line px-4 py-4">
      <div className="flex flex-wrap gap-1.5">
        {metaux.map((m) => (
          <button
            key={m.actifId}
            type="button"
            onClick={() => setMetalId(m.actifId)}
            className={
              m.actifId === metalId
                ? "flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                : "flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-muted"
            }
          >
            <IconeMetal symbole={m.symbole} className="h-2.5 w-4" />
            {m.libelle}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {points.length < 2 ? (
          <p className="flex h-[100px] items-center justify-center text-center text-sm text-muted">
            Pas assez de cours enregistrés pour cette période.
          </p>
        ) : (
          <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} className="w-full text-accent" preserveAspectRatio="none">
            {achats.map((a, i) => {
              const cx = graphique!.x(a.date.getTime());
              return (
                <line
                  key={i}
                  x1={cx}
                  x2={cx}
                  y1={MARGE.haut}
                  y2={HAUTEUR - MARGE.bas}
                  stroke="var(--muted)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                >
                  <title>
                    Achat le {a.date.toLocaleDateString("fr-FR")} à {formatPrix(a.prix)}
                    {a.note ? ` (${a.note})` : ""}
                  </title>
                </line>
              );
            })}
            <path d={graphique!.chemin} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
            <text x={MARGE.gauche} y={HAUTEUR - 4} fontSize="9" fill="var(--muted)">
              {formatDateCourte(new Date(graphique!.xMin))}
            </text>
            <text x={LARGEUR - MARGE.droite} y={HAUTEUR - 4} fontSize="9" fill="var(--muted)" textAnchor="end">
              {formatDateCourte(new Date(graphique!.xMax))}
            </text>
          </svg>
        )}

        {plage === "an" || plage === "decennie" || plage === "toujours" ? (
          <p className="mt-2 text-xs text-muted">
            Historique limité pour l&apos;instant — l&apos;app enregistre les cours au fil du temps,
            cette vue s&apos;enrichira progressivement.
          </p>
        ) : null}

        {metal && !metal.automatique && (
          <p className="mt-2 text-xs text-muted">
            Cours manuel — pas d&apos;historique de marché, seulement les prix que tu as toi-même saisis.
          </p>
        )}

        {metal?.automatique && (
          <div className="mt-2 flex items-center gap-2">
            <form action={lancer}>
              <button
                type="submit"
                disabled={enCours}
                className="text-xs text-muted underline underline-offset-2 disabled:opacity-60"
              >
                {enCours ? "Chargement…" : "Charger les 30 derniers jours"}
              </button>
            </form>
            {etat.statut === "ok" && (
              <span className="text-xs text-muted">{etat.nombre} jours chargés.</span>
            )}
            {etat.statut === "erreur" && <span className="text-xs text-negative">{etat.message}</span>}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PLAGES.map((p) => (
          <button
            key={p.valeur}
            type="button"
            onClick={() => setPlage(p.valeur)}
            className={
              p.valeur === plage
                ? "rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground"
                : "rounded-full px-3 py-1 text-xs text-muted"
            }
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
