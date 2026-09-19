"use client";

import { useMemo, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { IconeMetal, IconeBanque, couleurMetal, COULEUR_BANQUE } from "@/lib/icones-actifs";

export type PointCours = { date: string; prix: number };
export type MetalGraphique = { actifId: string; libelle: string; symbole: string };
export type AchatMetal = { date: string; prix: number; poids: number; note: string | null };
export type CompteGraphique = { actifId: string; libelle: string; identifiantExterne: string | null };

/** Une courbe sélectionnable par onglet — métal, compte, ou toute autre famille avec un historique de `cours`. */
type SerieGraphique = { id: string; libelle: string; couleur: string; icone: ReactNode };
/** Marqueur vertical optionnel sur la courbe (ex. un achat de métal) — absent pour un simple suivi de solde. */
type MarqueurGraphique = { date: string; prix: number; ligne2?: string };

const PLAGES = [
  { valeur: "semaine", label: "1 semaine", jours: 7 },
  { valeur: "mois", label: "1 mois", jours: 30 },
  { valeur: "an", label: "1 an", jours: 365 },
  { valeur: "decennie", label: "10 ans", jours: 3650 },
  { valeur: "toujours", label: "Toujours", jours: Infinity },
] as const;

/**
 * Nombre de décimales à afficher pour un prix — 2 suffisent pour l'or ou
 * l'argent, mais le cuivre vaut quelques centimes le gramme : à 2 décimales
 * tout s'arrondirait à "0,01 €" et les variations deviendraient invisibles.
 * On garde environ 3 chiffres significatifs sous 1€.
 */
function decimalesPour(valeur: number): number {
  const abs = Math.abs(valeur);
  if (abs === 0 || abs >= 1) return 2;
  return Math.min(6, 2 - Math.floor(Math.log10(abs)));
}

/**
 * Décimales pour les graduations de l'axe Y — dérivées du PAS entre deux
 * graduations, pas de leur valeur : sinon un pas de 0,0005€ (cuivre) se
 * retrouve avec 6 décimales inutiles alors que 4 suffisent à le distinguer.
 */
function decimalesPourPas(pas: number): number {
  if (pas >= 1) return 0;
  return Math.max(0, -Math.floor(Math.log10(pas)));
}

const formatPrix = (n: number) => {
  const decimales = decimalesPour(n);
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
};

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

/**
 * Courbe d'historique générique — un onglet par série (métal, compte…),
 * plages de temps, curseur tactile, et marqueurs verticaux optionnels (les
 * achats de métaux physiques). Toute famille qui accumule un historique dans
 * `cours` peut réutiliser ce même composant plutôt que d'en réécrire un.
 */
function GraphiqueHistorique({
  series,
  coursParSerie,
  marqueursParSerie,
  suffixeUnite = "",
}: {
  series: SerieGraphique[];
  coursParSerie: Record<string, PointCours[]>;
  marqueursParSerie?: Record<string, MarqueurGraphique[]>;
  suffixeUnite?: string;
}) {
  const [serieId, setSerieId] = useState(series[0]?.id ?? "");
  const [plage, setPlage] = useState<(typeof PLAGES)[number]["valeur"]>("mois");
  // Lu une seule fois (initialiseur paresseux) : Date.now() est impur et ne
  // doit pas être appelé directement pendant le rendu.
  const [maintenant] = useState(() => Date.now());

  const svgRef = useRef<SVGSVGElement>(null);
  const [curseurActif, setCurseurActif] = useState(false);
  const [curseurTemps, setCurseurTemps] = useState<number | null>(null);

  const serie = series.find((s) => s.id === serieId);
  const couleur = serie?.couleur ?? "#9a9a9a";
  const joursPlage = PLAGES.find((p) => p.valeur === plage)!.jours;
  const seuil = Number.isFinite(joursPlage) ? maintenant - joursPlage * 24 * 60 * 60 * 1000 : -Infinity;

  const tousLesPoints = useMemo(
    () =>
      (coursParSerie[serieId] ?? [])
        .map((p) => ({ date: new Date(p.date), prix: p.prix }))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [coursParSerie, serieId],
  );

  const points = useMemo(
    () => tousLesPoints.filter((p) => p.date.getTime() >= seuil),
    [tousLesPoints, seuil],
  );

  const marqueurs = useMemo(() => {
    return (marqueursParSerie?.[serieId] ?? [])
      .map((m) => ({ ...m, date: new Date(m.date) }))
      .filter((m) => m.date.getTime() >= seuil);
  }, [marqueursParSerie, serieId, seuil]);

  const dernierPrixConnu = tousLesPoints.at(-1)?.prix;
  const premierPrixPeriode = points[0]?.prix;

  const graphique = useMemo(() => {
    if (points.length < 2) return null;
    const dates = points.map((p) => p.date.getTime());
    const prix = points.map((p) => p.prix);
    const marqueursPrix = marqueurs.map((m) => m.prix);
    const xMin = Math.min(...dates);
    const xMax = Math.max(...dates);
    const yDonneesMin = Math.min(...prix, ...marqueursPrix);
    const yDonneesMax = Math.max(...prix, ...marqueursPrix);
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
    // Décimales dérivées du pas, pas de chaque valeur individuellement —
    // sinon un tick tombant pile sur 0 afficherait moins de décimales que
    // ses voisins.
    const decimalesAxe = decimalesPourPas(pasY);

    const nbTicksX = 5;
    const avecAnnee = xMax - xMin > 400 * 24 * 60 * 60 * 1000;
    const ticksX = Array.from({ length: nbTicksX }, (_, i) => xMin + ((xMax - xMin) * i) / (nbTicksX - 1));

    return { x, y, chemin, aire, ticksY, ticksX, avecAnnee, xMin, xMax, decimalesAxe };
  }, [points, marqueurs]);

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

  // Accroche sur un marqueur quand le curseur en est tout proche (en
  // distance à l'écran, pas en temps) — inspiré du survol des tooltips
  // Shopify qui "capturent" le point de données le plus proche.
  const marqueurProche = useMemo(() => {
    if (curseurTemps === null || !graphique || marqueurs.length === 0) return null;
    const curseurX = graphique.x(curseurTemps);
    let proche: (typeof marqueurs)[number] | null = null;
    let ecart = Infinity;
    for (const m of marqueurs) {
      const e = Math.abs(graphique.x(m.date.getTime()) - curseurX);
      if (e < ecart) {
        ecart = e;
        proche = m;
      }
    }
    return proche && ecart <= SEUIL_ACCROCHE ? proche : null;
  }, [curseurTemps, marqueurs, graphique]);

  const prixAffiche = pointSurvole ? pointSurvole.prix : dernierPrixConnu;
  // Une fois accroché à un marqueur, la date affichée est celle du marqueur
  // (là où la ligne verticale se trouve visuellement), pas celle — parfois
  // légèrement décalée par des trous dans l'historique — du cours connu le
  // plus proche.
  const dateAffichee = marqueurProche ? marqueurProche.date : pointSurvole?.date ?? null;
  const variation =
    prixAffiche !== undefined && premierPrixPeriode !== undefined && premierPrixPeriode !== 0
      ? ((prixAffiche - premierPrixPeriode) / premierPrixPeriode) * 100
      : null;
  const performanceMarqueur =
    marqueurProche && dernierPrixConnu !== undefined
      ? ((dernierPrixConnu - marqueurProche.prix) / marqueurProche.prix) * 100
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
  // Position horizontale (en %) de l'encart du marqueur, resserrée pour ne
  // pas déborder du graphique près des bords sur petit écran.
  const marqueurEncartGauche =
    graphique && marqueurProche
      ? Math.min(85, Math.max(15, (graphique.x(marqueurProche.date.getTime()) / LARGEUR) * 100))
      : null;

  return (
    <div className="border-b border-line px-4 py-4">
      <div className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {series.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSerieId(s.id)}
            className={
              s.id === serieId
                ? "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-accent-foreground"
                : "flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-muted"
            }
            style={s.id === serieId ? { backgroundColor: s.couleur } : undefined}
          >
            {s.icone}
            {s.libelle}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-start justify-between">
        <p className="text-sm text-muted">
          {serie?.libelle}
          {suffixeUnite}
        </p>
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
                    {v.toLocaleString("fr-FR", {
                      minimumFractionDigits: graphique.decimalesAxe,
                      maximumFractionDigits: graphique.decimalesAxe,
                    })}
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

              {marqueurs.map((m, i) => {
                const cx = graphique.x(m.date.getTime());
                const proche = marqueurProche === m;
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
                      {m.date.toLocaleDateString("fr-FR")} — {formatPrix(m.prix)}
                      {m.ligne2 ? ` (${m.ligne2})` : ""}
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

            {curseurActif && marqueurProche && marqueurEncartGauche !== null && (
              <div
                className="pointer-events-none absolute top-1 z-10 w-40 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 shadow-lg"
                style={{ left: `${marqueurEncartGauche}%` }}
              >
                <p className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: couleur }} />
                  Achat du {formatDateLongue(marqueurProche.date)}
                </p>
                <p className="mt-1 inline-block rounded bg-background px-2 py-0.5 text-sm font-medium text-foreground">
                  {formatPrix(marqueurProche.prix)}
                </p>
                {marqueurProche.ligne2 && <p className="mt-1 text-[11px] text-muted">{marqueurProche.ligne2}</p>}
                {performanceMarqueur !== null && (
                  <p className={`mt-1 text-[11px] ${performanceMarqueur >= 0 ? "text-positive" : "text-negative"}`}>
                    {performanceMarqueur >= 0 ? "▲" : "▼"} {Math.abs(performanceMarqueur).toFixed(1)}% depuis
                    l&apos;achat
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

/** Façade métaux (achats affichés en marqueurs, unité €/gramme) — historique. */
export function GraphiqueHistoriqueMetal({
  metaux,
  coursParActif,
  achatsParActif,
}: {
  metaux: MetalGraphique[];
  coursParActif: Record<string, PointCours[]>;
  achatsParActif: Record<string, AchatMetal[]>;
}) {
  const series = metaux.map((m) => ({
    id: m.actifId,
    libelle: m.libelle,
    couleur: couleurMetal(m.symbole),
    icone: <IconeMetal symbole={m.symbole} className="h-2.5 w-4" />,
  }));
  const marqueursParSerie = Object.fromEntries(
    Object.entries(achatsParActif).map(([actifId, achats]) => [
      actifId,
      achats.map((a) => ({
        date: a.date,
        prix: a.prix,
        ligne2: `${a.poids} g${a.note ? ` · ${a.note}` : ""}`,
      })),
    ]),
  );

  return (
    <GraphiqueHistorique
      series={series}
      coursParSerie={coursParActif}
      marqueursParSerie={marqueursParSerie}
      suffixeUnite=" · €/gramme"
    />
  );
}

/** Façade comptes (BoursoBank, Trade Republic, Livret A…) — simple suivi de solde, sans marqueur. */
export function GraphiqueHistoriqueComptes({
  comptes,
  coursParActif,
}: {
  comptes: CompteGraphique[];
  coursParActif: Record<string, PointCours[]>;
}) {
  const series = comptes.map((c) => ({
    id: c.actifId,
    libelle: c.libelle,
    couleur: COULEUR_BANQUE,
    icone: <IconeBanque identifiantExterne={c.identifiantExterne} className="h-4 w-4" />,
  }));

  return <GraphiqueHistorique series={series} coursParSerie={coursParActif} />;
}
