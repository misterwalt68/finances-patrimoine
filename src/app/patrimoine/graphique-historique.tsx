"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { IconeMetal, couleurMetal } from "@/lib/icones-actifs";

export type PointCours = { date: string; prix: number };
export type MetalGraphique = { actifId: string; libelle: string; symbole: string };
export type AchatMetal = { date: string; prix: number; poids: number; note: string | null };

const PLAGES = [
  { valeur: "semaine", label: "1 semaine", jours: 7 },
  { valeur: "mois", label: "1 mois", jours: 30 },
  { valeur: "an", label: "1 an", jours: 365 },
  { valeur: "decennie", label: "10 ans", jours: 3650 },
  { valeur: "toujours", label: "Toujours", jours: Infinity },
] as const;

const formatPrix = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

const formatDateCourte = (d: Date, avecAnnee: boolean) =>
  d.toLocaleDateString("fr-FR", avecAnnee ? { month: "short", year: "2-digit" } : { day: "2-digit", month: "short" });

const formatDateLongue = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const LARGEUR = 640;
const HAUTEUR = 260;
const MARGE = { haut: 16, bas: 28, gauche: 54, droite: 12 };
// Distance (en unités du viewBox) en dessous de laquelle le curseur "accroche"
// une ligne d'achat — assez large pour un doigt sur iPhone, sans capturer
// tout le graphique.
const SEUIL_ACCROCHE = 16;

/** Un pas "rond" (1/2/5 × 10ⁿ) pour des graduations lisibles, jamais 37 ou 683. */
function pasAgreable(intervalle: number, nbTicksVoulu: number): number {
  if (intervalle <= 0) return 1;
  const brut = intervalle / nbTicksVoulu;
  const magnitude = Math.pow(10, Math.floor(Math.log10(brut)));
  const residu = brut / magnitude;
  const pas = residu >= 5 ? 10 : residu >= 2 ? 5 : residu >= 1 ? 2 : 1;
  return pas * magnitude;
}

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

  const svgRef = useRef<SVGSVGElement>(null);
  const [curseurActif, setCurseurActif] = useState(false);
  const [curseurTemps, setCurseurTemps] = useState<number | null>(null);

  const metal = metaux.find((m) => m.actifId === metalId);
  const couleur = metal ? couleurMetal(metal.symbole) : "#9a9a9a";
  const joursPlage = PLAGES.find((p) => p.valeur === plage)!.jours;
  const seuil = Number.isFinite(joursPlage) ? maintenant - joursPlage * 24 * 60 * 60 * 1000 : -Infinity;

  const tousLesPoints = useMemo(
    () =>
      (coursParActif[metalId] ?? [])
        .map((p) => ({ date: new Date(p.date), prix: p.prix }))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [coursParActif, metalId],
  );

  const points = useMemo(
    () => tousLesPoints.filter((p) => p.date.getTime() >= seuil),
    [tousLesPoints, seuil],
  );

  const achats = useMemo(() => {
    return (achatsParActif[metalId] ?? [])
      .map((a) => ({ ...a, date: new Date(a.date) }))
      .filter((a) => a.date.getTime() >= seuil);
  }, [achatsParActif, metalId, seuil]);

  const dernierPrixConnu = tousLesPoints.at(-1)?.prix;
  const premierPrixPeriode = points[0]?.prix;

  const graphique = useMemo(() => {
    if (points.length < 2) return null;
    const dates = points.map((p) => p.date.getTime());
    const prix = points.map((p) => p.prix);
    const achatsPrix = achats.map((a) => a.prix);
    const xMin = Math.min(...dates);
    const xMax = Math.max(...dates);
    const yDonneesMin = Math.min(...prix, ...achatsPrix);
    const yDonneesMax = Math.max(...prix, ...achatsPrix);
    const pasY = pasAgreable(yDonneesMax - yDonneesMin || yDonneesMax || 1, 4);
    const yMin = Math.max(0, Math.floor(yDonneesMin / pasY) * pasY - pasY);
    const yMax = Math.ceil(yDonneesMax / pasY) * pasY + pasY;

    const x = (t: number) =>
      MARGE.gauche + ((t - xMin) / (xMax - xMin || 1)) * (LARGEUR - MARGE.gauche - MARGE.droite);
    const y = (p: number) =>
      HAUTEUR - MARGE.bas - ((p - yMin) / (yMax - yMin || 1)) * (HAUTEUR - MARGE.haut - MARGE.bas);

    const chemin = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date.getTime())},${y(p.prix)}`).join(" ");
    const aire = `${chemin} L${x(xMax)},${y(yMin)} L${x(xMin)},${y(yMin)} Z`;

    const ticksY: number[] = [];
    for (let v = Math.ceil(yMin / pasY) * pasY; v <= yMax; v += pasY) ticksY.push(v);

    const nbTicksX = 5;
    const avecAnnee = xMax - xMin > 400 * 24 * 60 * 60 * 1000;
    const ticksX = Array.from({ length: nbTicksX }, (_, i) => xMin + ((xMax - xMin) * i) / (nbTicksX - 1));

    return { x, y, chemin, aire, ticksY, ticksX, avecAnnee, xMin, xMax };
  }, [points, achats]);

  // Point de données le plus proche du curseur (position du doigt/souris) —
  // seulement pendant une interaction active, sinon on reste sur "aujourd'hui".
  const pointSurvole = useMemo(() => {
    if (curseurTemps === null || points.length === 0) return null;
    let proche = points[0];
    let ecart = Infinity;
    for (const p of points) {
      const e = Math.abs(p.date.getTime() - curseurTemps);
      if (e < ecart) {
        ecart = e;
        proche = p;
      }
    }
    return proche;
  }, [curseurTemps, points]);

  // Accroche sur une ligne d'achat quand le curseur en est tout proche
  // (en distance à l'écran, pas en temps) — inspiré du survol des tooltips
  // Shopify qui "capturent" le point de données le plus proche.
  const achatProche = useMemo(() => {
    if (curseurTemps === null || !graphique || achats.length === 0) return null;
    const curseurX = graphique.x(curseurTemps);
    let proche: (typeof achats)[number] | null = null;
    let ecart = Infinity;
    for (const a of achats) {
      const e = Math.abs(graphique.x(a.date.getTime()) - curseurX);
      if (e < ecart) {
        ecart = e;
        proche = a;
      }
    }
    return proche && ecart <= SEUIL_ACCROCHE ? proche : null;
  }, [curseurTemps, achats, graphique]);

  const prixAffiche = pointSurvole ? pointSurvole.prix : dernierPrixConnu;
  // Une fois accroché à un achat, la date affichée est celle de l'achat (là
  // où la ligne verticale se trouve visuellement), pas celle — parfois
  // légèrement décalée par des trous dans l'historique — du cours connu le
  // plus proche.
  const dateAffichee = achatProche ? achatProche.date : pointSurvole?.date ?? null;
  const variation =
    prixAffiche !== undefined && premierPrixPeriode !== undefined && premierPrixPeriode !== 0
      ? ((prixAffiche - premierPrixPeriode) / premierPrixPeriode) * 100
      : null;
  const performanceAchat =
    achatProche && dernierPrixConnu !== undefined
      ? ((dernierPrixConnu - achatProche.prix) / achatProche.prix) * 100
      : null;

  function positionCurseur(clientX: number) {
    if (!graphique || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const fractionX = (clientX - rect.left) / rect.width;
    const svgX = Math.min(Math.max(fractionX, 0), 1) * LARGEUR;
    const xClamped = Math.min(Math.max(svgX, MARGE.gauche), LARGEUR - MARGE.droite);
    const t =
      graphique.xMin +
      ((xClamped - MARGE.gauche) / (LARGEUR - MARGE.gauche - MARGE.droite)) * (graphique.xMax - graphique.xMin);
    setCurseurTemps(t);
  }

  function debuterCurseur(e: ReactPointerEvent<SVGSVGElement>) {
    if (!graphique) return;
    setCurseurActif(true);
    positionCurseur(e.clientX);
  }

  function deplacerCurseur(e: ReactPointerEvent<SVGSVGElement>) {
    if (!curseurActif) return;
    positionCurseur(e.clientX);
  }

  function terminerCurseur() {
    setCurseurActif(false);
    setCurseurTemps(null);
  }

  const curseurX = graphique && dateAffichee ? graphique.x(dateAffichee.getTime()) : null;
  // Position horizontale (en %) de l'encart d'achat, resserrée pour ne pas
  // déborder du graphique près des bords sur petit écran.
  const achatEncartGauche =
    graphique && achatProche ? Math.min(85, Math.max(15, (graphique.x(achatProche.date.getTime()) / LARGEUR) * 100)) : null;

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
                ? "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-accent-foreground"
                : "flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-muted"
            }
            style={m.actifId === metalId ? { backgroundColor: couleurMetal(m.symbole) } : undefined}
          >
            <IconeMetal symbole={m.symbole} className="h-2.5 w-4" />
            {m.libelle}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-start justify-between">
        <p className="text-sm text-muted">{metal?.libelle} · €/gramme</p>
        {prixAffiche !== undefined && (
          <div className="text-right">
            <p className="flex items-baseline justify-end gap-2">
              <span className="text-lg font-semibold text-foreground">{formatPrix(prixAffiche)}</span>
              {variation !== null && (
                <span className={variation >= 0 ? "text-xs text-positive" : "text-xs text-negative"}>
                  {variation >= 0 ? "▲" : "▼"} {Math.abs(variation).toFixed(1)}%
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {dateAffichee ? formatDateLongue(dateAffichee) : "Aujourd'hui"}
            </p>
          </div>
        )}
      </div>

      <div className="relative mt-2">
        {!graphique ? (
          <p className="flex h-[140px] items-center justify-center text-center text-sm text-muted">
            Pas assez de cours enregistrés pour cette période.
          </p>
        ) : (
          <>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
              className="w-full touch-none select-none"
              preserveAspectRatio="none"
              onPointerDown={debuterCurseur}
              onPointerMove={deplacerCurseur}
              onPointerUp={terminerCurseur}
              onPointerLeave={terminerCurseur}
              onPointerCancel={terminerCurseur}
            >
              <defs>
                <linearGradient id="degradeAire" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={couleur} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={couleur} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              {graphique.ticksY.map((v) => (
                <g key={v}>
                  <line
                    x1={MARGE.gauche}
                    x2={LARGEUR - MARGE.droite}
                    y1={graphique.y(v)}
                    y2={graphique.y(v)}
                    stroke="var(--line)"
                    strokeWidth={1}
                  />
                  <text x={MARGE.gauche - 6} y={graphique.y(v) + 3} fontSize="9" fill="var(--muted)" textAnchor="end">
                    {Math.round(v).toLocaleString("fr-FR")}
                  </text>
                </g>
              ))}

              {graphique.ticksX.map((t, i) => (
                <text
                  key={i}
                  x={graphique.x(t)}
                  y={HAUTEUR - 8}
                  fontSize="9"
                  fill="var(--muted)"
                  textAnchor={i === 0 ? "start" : i === graphique.ticksX.length - 1 ? "end" : "middle"}
                >
                  {formatDateCourte(new Date(t), graphique.avecAnnee)}
                </text>
              ))}

              {achats.map((a, i) => {
                const cx = graphique.x(a.date.getTime());
                const proche = achatProche === a;
                return (
                  <line
                    key={i}
                    x1={cx}
                    x2={cx}
                    y1={MARGE.haut}
                    y2={HAUTEUR - MARGE.bas}
                    stroke={proche ? "var(--foreground)" : "var(--muted)"}
                    strokeWidth={proche ? 1.5 : 1}
                    strokeDasharray="3 3"
                  >
                    <title>
                      Achat le {a.date.toLocaleDateString("fr-FR")} à {formatPrix(a.prix)}
                      {a.note ? ` (${a.note})` : ""}
                    </title>
                  </line>
                );
              })}

              <path d={graphique.aire} fill="url(#degradeAire)" stroke="none" />
              <path d={graphique.chemin} fill="none" stroke={couleur} strokeWidth={2} strokeLinejoin="round" />

              {curseurActif && pointSurvole && curseurX !== null && (
                <>
                  <line
                    x1={curseurX}
                    x2={curseurX}
                    y1={MARGE.haut}
                    y2={HAUTEUR - MARGE.bas}
                    stroke={couleur}
                    strokeWidth={1.5}
                  />
                  <circle
                    cx={curseurX}
                    cy={graphique.y(pointSurvole.prix)}
                    r={4}
                    fill={couleur}
                    stroke="var(--surface)"
                    strokeWidth={1.5}
                  />
                </>
              )}
            </svg>

            {curseurActif && achatProche && achatEncartGauche !== null && (
              <div
                className="pointer-events-none absolute top-1 z-10 w-40 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 shadow-lg"
                style={{ left: `${achatEncartGauche}%` }}
              >
                <p className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: couleur }} />
                  Achat du {formatDateLongue(achatProche.date)}
                </p>
                <p className="mt-1 inline-block rounded bg-background px-2 py-0.5 text-sm font-medium text-foreground">
                  {formatPrix(achatProche.prix)}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {achatProche.poids} g{achatProche.note ? ` · ${achatProche.note}` : ""}
                </p>
                {performanceAchat !== null && (
                  <p className={`mt-1 text-[11px] ${performanceAchat >= 0 ? "text-positive" : "text-negative"}`}>
                    {performanceAchat >= 0 ? "▲" : "▼"} {Math.abs(performanceAchat).toFixed(1)}% depuis l&apos;achat
                  </p>
                )}
              </div>
            )}
          </>
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
