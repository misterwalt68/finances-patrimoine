"use client";

import { useMemo, useState } from "react";
import { TYPES_ACTIF } from "@/lib/constants";
import { COULEURS_PAR_TYPE } from "./camembert";

export type PointHistoriquePatrimoine = { horodatage: string; personneId: string; type: string; valeur: number };

const libelleType = (type: string) => TYPES_ACTIF.find((t) => t.value === type)?.label ?? type;

const formatEurArrondi = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const LARGEUR = 640;
const HAUTEUR = 260;
const MARGE = { haut: 16, bas: 28, gauche: 8, droite: 8 };

type Granularite = "mois" | "annee";

function clePeriode(date: Date, granularite: Granularite): string {
  return granularite === "mois"
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    : `${date.getFullYear()}`;
}

function libellePeriode(cle: string, granularite: Granularite): string {
  if (granularite === "annee") return cle;
  const [annee, mois] = cle.split("-").map(Number);
  return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

/**
 * Évolution du patrimoine total dans le temps, en barres empilées par
 * famille — le pendant "dans le temps" du camembert (instantané). Part de
 * zéro (décision de Maxime) : une barre par période, construite au fil des
 * actualisations à venir, jamais reconstruite depuis l'historique déjà
 * accumulé sur chaque actif individuellement.
 */
export function GraphiqueRepartitionPatrimoine({ historique }: { historique: PointHistoriquePatrimoine[] }) {
  const [granularite, setGranularite] = useState<Granularite>("mois");
  const [periodeActive, setPeriodeActive] = useState<string | null>(null);

  // Pour chaque période, ne garde que le DERNIER instantané connu par
  // (personne, famille) — comme un "cours de clôture", pas la somme de
  // toutes les actualisations tombées dans la même période. Le total d'une
  // période/famille est ensuite la somme sur les personnes déjà filtrées en
  // amont (page.tsx) — "Couple" reçoit Maxime + Amélie + Couple, un
  // individu ne reçoit que ses propres lignes.
  const { periodes, typesPresents } = useMemo(() => {
    const dernierParCle = new Map<string, { horodatage: number; valeur: number }>();
    for (const point of historique) {
      const date = new Date(point.horodatage);
      const cleComplete = `${clePeriode(date, granularite)}|${point.personneId}|${point.type}`;
      const t = date.getTime();
      const existant = dernierParCle.get(cleComplete);
      if (!existant || t > existant.horodatage) {
        dernierParCle.set(cleComplete, { horodatage: t, valeur: point.valeur });
      }
    }

    const parPeriode = new Map<string, Record<string, number>>();
    const typesVus = new Set<string>();
    for (const [cleComplete, { valeur }] of dernierParCle) {
      const [cle, , type] = cleComplete.split("|");
      typesVus.add(type);
      const bucket = parPeriode.get(cle) ?? {};
      bucket[type] = (bucket[type] ?? 0) + valeur;
      parPeriode.set(cle, bucket);
    }

    // Ordre d'empilement fixe (dataviz : "color follows the entity, never
    // its rank") — suit TYPES_ACTIF, jamais retrié par grandeur, sinon les
    // couleurs changeraient de place d'une barre à l'autre.
    const typesOrdonnes = TYPES_ACTIF.map((t) => t.value).filter((v) => typesVus.has(v));

    return {
      periodes: [...parPeriode.keys()].sort().map((cle) => ({ cle, valeurs: parPeriode.get(cle)! })),
      typesPresents: typesOrdonnes,
    };
  }, [historique, granularite]);

  const maxTotal = Math.max(1, ...periodes.map((p) => typesPresents.reduce((s, t) => s + (p.valeurs[t] ?? 0), 0)));

  const zoneHauteur = HAUTEUR - MARGE.haut - MARGE.bas;
  const largeurDispo = LARGEUR - MARGE.gauche - MARGE.droite;
  const nbBarres = periodes.length;
  const largeurCreneau = nbBarres > 0 ? largeurDispo / nbBarres : 0;
  const largeurBarre = Math.min(56, largeurCreneau * 0.6);

  const clePeriodeAffichee = periodeActive ?? periodes.at(-1)?.cle ?? null;
  const periode = periodes.find((p) => p.cle === clePeriodeAffichee);
  const totalPeriode = periode ? typesPresents.reduce((s, t) => s + (periode.valeurs[t] ?? 0), 0) : 0;

  return (
    <div className="px-1 py-1">
      <div className="flex items-center justify-between">
        <div>
          {periode ? (
            <>
              <p className="text-lg font-semibold text-foreground">{formatEurArrondi(totalPeriode)}</p>
              <p className="text-xs text-muted">{libellePeriode(periode.cle, granularite)}</p>
            </>
          ) : (
            <p className="text-sm text-muted">Évolution du patrimoine</p>
          )}
        </div>
        <div className="flex gap-1">
          {(["mois", "annee"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGranularite(g);
                setPeriodeActive(null);
              }}
              className={
                g === granularite
                  ? "rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground"
                  : "rounded-full px-3 py-1 text-xs text-muted"
              }
            >
              {g === "mois" ? "Mois" : "Année"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-3">
        {periodes.length === 0 ? (
          <p className="flex h-[140px] items-center justify-center text-center text-sm text-muted">
            Pas encore d&apos;historique — chaque tirage vers le bas pour actualiser construit une donnée de plus.
          </p>
        ) : (
          <svg
            viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
            className="w-full touch-none select-none"
            preserveAspectRatio="none"
          >
            {periodes.map((p, i) => {
              const x = MARGE.gauche + largeurCreneau * i + (largeurCreneau - largeurBarre) / 2;
              const active = p.cle === clePeriodeAffichee;
              let yCumule = HAUTEUR - MARGE.bas;
              return (
                <g key={p.cle} onClick={() => setPeriodeActive(p.cle)} className="cursor-pointer">
                  <rect x={x} y={MARGE.haut} width={largeurBarre} height={zoneHauteur} fill="transparent" />
                  {typesPresents.map((type) => {
                    const valeur = p.valeurs[type] ?? 0;
                    if (valeur <= 0) return null;
                    const h = (valeur / maxTotal) * zoneHauteur;
                    yCumule -= h;
                    return (
                      <rect
                        key={type}
                        x={x}
                        y={yCumule}
                        width={largeurBarre}
                        height={h}
                        fill={COULEURS_PAR_TYPE[type] ?? "#898781"}
                        opacity={active ? 1 : 0.5}
                        rx={2}
                      />
                    );
                  })}
                  <text x={x + largeurBarre / 2} y={HAUTEUR - 8} fontSize="9" fill="var(--muted)" textAnchor="middle">
                    {libellePeriode(p.cle, granularite)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {periode && (
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {typesPresents.map((type) => {
            const valeur = periode.valeurs[type];
            if (!valeur) return null;
            return (
              <li key={type} className="flex items-center gap-1.5 text-xs text-muted">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: COULEURS_PAR_TYPE[type] ?? "#898781" }}
                />
                {libelleType(type)} · {formatEurArrondi(valeur)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
