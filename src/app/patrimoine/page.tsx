import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { positions, actifs, comptes, institutions, cours } from "@/db/schema";
import { Carte, Badge, ListeVide } from "@/components/ui/carte";
import { separerApportsEtPerformance } from "@/lib/patrimoine/calculs";
import { TYPES_ACTIF } from "@/lib/constants";
import { actualiserCours } from "./actions";
import { AjouterPosition } from "./ajouter-position";
import { CamembertAllocation } from "./camembert";
import { ModifierPositionBouton } from "./modifier-position";
import { IconeActif } from "@/lib/icones-actifs";
import { GraphiqueHistoriqueMetal, GraphiqueHistoriqueComptes, GraphiqueHistoriqueFonds } from "./graphique-historique";
import { GraphiqueDepliable } from "./graphique-depliable";

// Arrondi (0 décimale) — réservé aux totaux (carte "Valeur totale", camembert,
// total par famille) : plus lisible en un coup d'œil.
const formatEurArrondi = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// Précis (toujours 2 décimales) — pour chaque ligne de détail (valeur,
// apports, performance d'une position) : jamais d'arrondi qui cache l'écart
// réel, à la demande de Maxime.
const formatEurPrecis = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Précise l'unité entre parenthèses pour les familles où "unités" seul est
// ambigu — les métaux se pèsent en grammes.
const uniteQuantite = (type: string | undefined) => (type === "metal" ? "unités (grammes)" : "unités");

export default async function PagePatrimoine() {
  const [listePositions, listeActifs, listeComptes, listeInstitutions, listeCours] =
    await Promise.all([
      db.select().from(positions).orderBy(positions.updatedAt),
      db.select().from(actifs).orderBy(actifs.libelle),
      db.select().from(comptes).orderBy(comptes.libelle),
      db.select().from(institutions),
      db.select().from(cours).orderBy(desc(cours.horodatage)),
    ]);

  const actifsParId = new Map(listeActifs.map((a) => [a.id, a]));
  const comptesParId = new Map(listeComptes.map((c) => [c.id, c]));

  const dernierCoursParActifId = new Map<string, (typeof listeCours)[number]>();
  for (const c of listeCours) {
    if (!dernierCoursParActifId.has(c.actifId)) dernierCoursParActifId.set(c.actifId, c);
  }

  const lignes = listePositions.map((p) => {
    const actif = actifsParId.get(p.actifId);
    const compte = comptesParId.get(p.compteId);
    const dernierCours = dernierCoursParActifId.get(p.actifId);
    const quantite = Number(p.quantite);
    const prixRevientMoyen = Number(p.prixRevientMoyen ?? 0);
    const calcul = dernierCours
      ? separerApportsEtPerformance({
          quantite,
          prixRevientMoyen,
          dernierCours: Number(dernierCours.prix),
        })
      : null;
    return { position: p, actif, compte, dernierCours, calcul, quantite, prixRevientMoyen };
  });

  const totalValeur = lignes.reduce((s, l) => s + (l.calcul?.valeurActuelle ?? 0), 0);
  const totalApports = lignes.reduce(
    (s, l) => s + (l.calcul?.apports ?? l.quantite * l.prixRevientMoyen),
    0,
  );
  const totalPerformance = totalValeur - totalApports;

  const donneesInsuffisantes = listeComptes.length === 0 || listeActifs.length === 0;

  // Données du graphique historique des métaux : uniquement les métaux
  // présents dans les réglages, pas seulement ceux déjà en position — pour
  // pouvoir consulter le cours d'un métal avant même d'en posséder.
  const metauxActifs = listeActifs.filter((a) => a.type === "metal");
  const valeurPossedeeParActif = new Map<string, number>();
  for (const l of lignes) {
    if (l.actif?.type !== "metal") continue;
    valeurPossedeeParActif.set(
      l.actif.id,
      (valeurPossedeeParActif.get(l.actif.id) ?? 0) + (l.calcul?.valeurActuelle ?? 0),
    );
  }
  // Filtres triés par montant possédé, du plus grand au plus petit — les
  // métaux pas encore possédés restent consultables, mais après les autres.
  const metauxGraphique = metauxActifs
    .map((a) => ({
      actifId: a.id,
      libelle: a.libelle,
      symbole: a.identifiantExterne ?? "",
      valeurPossedee: valeurPossedeeParActif.get(a.id) ?? 0,
    }))
    .sort((a, b) => b.valeurPossedee - a.valeurPossedee);
  // Le graphique ne trace que des cours vérifiés par une vraie source de
  // marché ("metaux_historique"/"metaux") — un cours "manuel" resté en base
  // (ex. un ancien métal qui n'avait pas encore de prix automatique) peut
  // être une saisie ponctuelle sans rapport avec le marché, qui fausserait
  // toute l'échelle du graphique si elle s'y glissait.
  const coursParActifMetal: Record<string, { date: string; prix: number }[]> = {};
  for (const c of listeCours) {
    if (!metauxActifs.some((a) => a.id === c.actifId) || c.source === "manuel") continue;
    (coursParActifMetal[c.actifId] ??= []).push({
      date: c.horodatage.toISOString(),
      prix: Number(c.prix),
    });
  }
  const achatsParActifMetal: Record<string, { date: string; prix: number; poids: number; note: string | null }[]> = {};
  for (const l of lignes) {
    if (l.actif?.type !== "metal" || !l.position.dateAcquisition) continue;
    (achatsParActifMetal[l.actif.id] ??= []).push({
      date: l.position.dateAcquisition,
      prix: l.prixRevientMoyen,
      poids: l.quantite,
      note: l.position.note,
    });
  }

  // Données du graphique historique des comptes (cash) : un simple suivi de
  // solde dans le temps, à partir de l'historique déjà accumulé dans `cours`
  // à chaque actualisation — aucune donnée supplémentaire à stocker. Le
  // libellé inclut le compte entre parenthèses (ex. "BoursoBank (Livret A)")
  // pour distinguer deux comptes de la même banque, comme dans la liste.
  const comptesGraphique = lignes
    .filter((l) => l.actif?.type === "cash")
    .map((l) => ({
      actifId: l.actif!.id,
      libelle: `${l.actif!.libelle}${l.compte?.libelle ? ` (${l.compte.libelle})` : ""}`,
      identifiantExterne: l.actif!.identifiantExterne ?? null,
    }));
  const coursParActifCash: Record<string, { date: string; prix: number }[]> = {};
  for (const c of listeCours) {
    if (!comptesGraphique.some((cg) => cg.actifId === c.actifId)) continue;
    (coursParActifCash[c.actifId] ??= []).push({
      date: c.horodatage.toISOString(),
      prix: Number(c.prix),
    });
  }

  // Même principe pour les fonds/unités de compte (ex. Assurance-vie) —
  // simple suivi de valeur dans le temps, historique déjà accumulé dans
  // `cours` à chaque correction manuelle.
  const fondsGraphique = lignes
    .filter((l) => l.actif?.type === "fonds")
    .map((l) => ({
      actifId: l.actif!.id,
      libelle: `${l.actif!.libelle}${l.compte?.libelle ? ` (${l.compte.libelle})` : ""}`,
      identifiantExterne: l.actif!.identifiantExterne ?? null,
    }));
  const coursParActifFonds: Record<string, { date: string; prix: number }[]> = {};
  for (const c of listeCours) {
    if (!fondsGraphique.some((fg) => fg.actifId === c.actifId)) continue;
    (coursParActifFonds[c.actifId] ??= []).push({
      date: c.horodatage.toISOString(),
      prix: Number(c.prix),
    });
  }

  // Regroupement par famille (type d'actif) — l'ordre suit TYPES_ACTIF,
  // seules les familles ayant au moins une position sont affichées.
  const groupes = TYPES_ACTIF.map((t) => ({
    type: t.value,
    label: t.label,
    lignes: lignes.filter((l) => l.actif?.type === t.value),
  }))
    .filter((g) => g.lignes.length > 0)
    .map((g) => {
      const valeur = g.lignes.reduce((s, l) => s + (l.calcul?.valeurActuelle ?? 0), 0);
      const apports = g.lignes.reduce(
        (s, l) => s + (l.calcul?.apports ?? l.quantite * l.prixRevientMoyen),
        0,
      );
      const performance = valeur - apports;
      return {
        ...g,
        valeur,
        apports,
        performance,
        performancePct: apports !== 0 ? (performance / apports) * 100 : null,
      };
    });

  // Rappel mensuel : tout actif dont le cours n'est pas suivi automatiquement
  // (Livret A, une future Assurance-vie…) peut dériver silencieusement de la
  // réalité sans qu'on y touche — jamais mis à jour, ou mis à jour il y a
  // plus de 30 jours, deux cas où ça vaut le coup d'aller vérifier.
  // Composant serveur (pas de "use client") : recalculé une fois par
  // requête, jamais par un re-render client — l'impureté que la règle
  // react-hooks/purity redoute (pensée pour le rendu client) n'a pas prise ici.
  // eslint-disable-next-line react-hooks/purity
  const maintenantMs = Date.now();
  const actifsAVerifier = lignes
    .filter((l) => l.actif?.sourcePrix === "manuel")
    .map((l) => ({
      id: l.position.id,
      libelle: `${l.actif!.libelle}${l.compte?.libelle ? ` (${l.compte.libelle})` : ""}`,
      joursDepuis: l.dernierCours
        ? Math.floor((maintenantMs - l.dernierCours.horodatage.getTime()) / (24 * 60 * 60 * 1000))
        : null,
    }))
    .filter((a) => a.joursDepuis === null || a.joursDepuis >= 30);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-safe pt-safe">
      <header className="flex items-center justify-between py-6">
        <div>
          <Link href="/" className="text-sm text-muted transition-colors hover:text-foreground">
            ← Accueil
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Patrimoine
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <form action={actualiserCours}>
            <button
              type="submit"
              className="rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
            >
              Actualiser les cours
            </button>
          </form>
          {!donneesInsuffisantes && (
            <AjouterPosition
              listeActifs={listeActifs}
              listeComptes={listeComptes}
              listeInstitutions={listeInstitutions}
            />
          )}
        </div>
      </header>

      {actifsAVerifier.length > 0 && (
        <Carte className="mb-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-warning">
            <span aria-hidden>⚠</span> À vérifier ce mois-ci
          </p>
          <p className="mt-1 text-sm text-muted">
            Ces montants ne sont pas suivis en direct — pense à les recaler sur leur vraie valeur.
          </p>
          <ul className="mt-2 space-y-1">
            {actifsAVerifier.map((a) => (
              <li key={a.id} className="text-sm text-foreground">
                {a.libelle}
                <span className="text-muted">
                  {" — "}
                  {a.joursDepuis === null ? "jamais mis à jour" : `il y a ${a.joursDepuis} jours`}
                </span>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      <Carte accent>
        <p className="text-sm text-muted">Valeur totale</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground">
          {formatEurArrondi(totalValeur)}
        </p>
        <p className="mt-3 text-sm">
          <span className="text-muted">Apports </span>
          <span className="text-foreground">{formatEurArrondi(totalApports)}</span>
          <span className="text-muted"> · Performance </span>
          <span className={totalPerformance >= 0 ? "text-positive" : "text-negative"}>
            {totalPerformance >= 0 ? "+" : ""}
            {formatEurArrondi(totalPerformance)}
          </span>
        </p>
      </Carte>

      {groupes.length > 0 && (
        <div className="mt-4">
          <Carte>
            <CamembertAllocation groupes={groupes} />
          </Carte>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {donneesInsuffisantes && (
          <ListeVide>
            Crée d&apos;abord un compte et un actif dans les{" "}
            <Link href="/reglages" className="text-accent">
              réglages
            </Link>
            .
          </ListeVide>
        )}

        <div className="space-y-3">
          {groupes.length === 0 ? (
            <ListeVide>Aucune position pour l&apos;instant.</ListeVide>
          ) : (
            groupes.map((groupe) => {
              return (
                <details key={groupe.type} className="group rounded-2xl border border-line bg-surface open:pb-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
                    <span className="font-medium text-foreground">
                      {groupe.label}
                      <span className="ml-2 text-sm font-normal text-muted">
                        {groupe.lignes.length}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {formatEurArrondi(groupe.valeur)}
                        </span>
                        <span className="text-muted transition-transform group-open:rotate-180">▾</span>
                      </span>
                      <span
                        className={`text-xs ${groupe.performance >= 0 ? "text-positive" : "text-negative"}`}
                      >
                        {groupe.performance >= 0 ? "▲" : "▼"}
                        {groupe.performancePct !== null && (
                          <> {Math.abs(groupe.performancePct).toFixed(1)}% ·</>
                        )}{" "}
                        {groupe.performance >= 0 ? "+" : ""}
                        {formatEurPrecis(groupe.performance)}
                      </span>
                    </span>
                  </summary>
                  {groupe.type === "metal" && metauxGraphique.length > 0 && (
                    <GraphiqueHistoriqueMetal
                      metaux={metauxGraphique}
                      coursParActif={coursParActifMetal}
                      achatsParActif={achatsParActifMetal}
                    />
                  )}
                  {groupe.type === "cash" && comptesGraphique.length > 0 && (
                    <GraphiqueDepliable>
                      <GraphiqueHistoriqueComptes comptes={comptesGraphique} coursParActif={coursParActifCash} />
                    </GraphiqueDepliable>
                  )}
                  {groupe.type === "fonds" && fondsGraphique.length > 0 && (
                    <GraphiqueDepliable>
                      <GraphiqueHistoriqueFonds fonds={fondsGraphique} coursParActif={coursParActifFonds} />
                    </GraphiqueDepliable>
                  )}
                  <ul className="divide-y divide-line border-t border-line px-4">
                    {groupe.lignes.map((l) => (
                      <li key={l.position.id} className="relative py-3 pr-6">
                        <div className="flex items-center justify-between gap-3">
                          <p className="flex items-center gap-2 font-medium text-foreground">
                            <IconeActif
                              type={l.actif?.type}
                              identifiantExterne={l.actif?.identifiantExterne}
                            />
                            {l.actif?.libelle ?? "—"}
                            {l.actif?.type === "cash" && l.compte?.libelle && (
                              <span className="text-sm font-normal text-muted">({l.compte.libelle})</span>
                            )}
                          </p>
                          {l.calcul ? (
                            <p className="font-medium text-foreground">
                              {formatEurPrecis(l.calcul.valeurActuelle)}
                            </p>
                          ) : (
                            <Badge>Pas de cours</Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                          <span>{l.compte?.libelle}</span>
                          <span>
                            · {l.quantite} {uniteQuantite(l.actif?.type)}
                          </span>
                          {l.position.note && <Badge>{l.position.note}</Badge>}
                          {l.position.dateAcquisition && (
                            <Badge>
                              {new Date(l.position.dateAcquisition).toLocaleDateString("fr-FR")}
                            </Badge>
                          )}
                          {l.position.provisoire && <Badge>Provisoire</Badge>}
                        </div>
                        {l.calcul && (
                          <p className="mt-1 text-sm">
                            <span className="text-muted">
                              Apports {formatEurPrecis(l.calcul.apports)} ·{" "}
                            </span>
                            <span
                              className={l.calcul.performance >= 0 ? "text-positive" : "text-negative"}
                            >
                              {l.calcul.performance >= 0 ? "+" : ""}
                              {formatEurPrecis(l.calcul.performance)}
                            </span>
                          </p>
                        )}
                        <div className="absolute bottom-2 right-0">
                          <ModifierPositionBouton
                            position={l.position}
                            actifLibelle={l.actif?.libelle ?? "cette position"}
                            actifType={l.actif?.type}
                            sourcePrix={l.actif?.sourcePrix}
                            listeComptes={listeComptes}
                            listeInstitutions={listeInstitutions}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
