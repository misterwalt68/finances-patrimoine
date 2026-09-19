import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { positions, actifs, comptes, institutions, cours } from "@/db/schema";
import { Carte, Badge, ListeVide } from "@/components/ui/carte";
import { separerApportsEtPerformance } from "@/lib/patrimoine/calculs";
import { TYPES_ACTIF } from "@/lib/constants";
import { actualiserCours } from "./actions";
import { ApercuCoinbase } from "./apercu-coinbase";
import { FormulairePosition } from "./formulaire-position";
import { CamembertAllocation } from "./camembert";

// En dessous de 10€, 0 décimale masquerait tout (0,16€ afficherait "0 €").
const formatEur = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: Math.abs(n) < 10 ? 2 : 0,
  });

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

  // Regroupement par famille (type d'actif) — l'ordre suit TYPES_ACTIF,
  // seules les familles ayant au moins une position sont affichées.
  const groupes = TYPES_ACTIF.map((t) => ({
    type: t.value,
    label: t.label,
    lignes: lignes.filter((l) => l.actif?.type === t.value),
  }))
    .filter((g) => g.lignes.length > 0)
    .map((g) => ({
      ...g,
      valeur: g.lignes.reduce((s, l) => s + (l.calcul?.valeurActuelle ?? 0), 0),
    }));

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
        <form action={actualiserCours}>
          <button
            type="submit"
            className="rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            Actualiser les cours
          </button>
        </form>
      </header>

      <Carte accent>
        <p className="text-sm text-muted">Valeur totale</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground">
          {formatEur(totalValeur)}
        </p>
        <p className="mt-3 text-sm">
          <span className="text-muted">Apports </span>
          <span className="text-foreground">{formatEur(totalApports)}</span>
          <span className="text-muted"> · Performance </span>
          <span className={totalPerformance >= 0 ? "text-positive" : "text-negative"}>
            {totalPerformance >= 0 ? "+" : ""}
            {formatEur(totalPerformance)}
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
        <ApercuCoinbase />

        {donneesInsuffisantes ? (
          <ListeVide>
            Crée d&apos;abord un compte et un actif dans les{" "}
            <Link href="/reglages" className="text-accent">
              réglages
            </Link>
            .
          </ListeVide>
        ) : (
          <FormulairePosition
            listeActifs={listeActifs}
            listeComptes={listeComptes}
            listeInstitutions={listeInstitutions}
          />
        )}

        <div className="space-y-3">
          {groupes.length === 0 ? (
            <ListeVide>Aucune position pour l&apos;instant.</ListeVide>
          ) : (
            groupes.map((groupe) => {
              return (
                <details key={groupe.type} className="group rounded-2xl border border-line bg-surface open:pb-2" open>
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
                    <span className="font-medium text-foreground">
                      {groupe.label}
                      <span className="ml-2 text-sm font-normal text-muted">
                        {groupe.lignes.length}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{formatEur(groupe.valeur)}</span>
                      <span className="text-muted transition-transform group-open:rotate-180">▾</span>
                    </span>
                  </summary>
                  <ul className="divide-y divide-line border-t border-line px-4">
                    {groupe.lignes.map((l) => (
                      <li key={l.position.id} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-foreground">{l.actif?.libelle ?? "—"}</p>
                          {l.calcul ? (
                            <p className="font-medium text-foreground">
                              {formatEur(l.calcul.valeurActuelle)}
                            </p>
                          ) : (
                            <Badge>Pas de cours</Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                          <span>{l.compte?.libelle}</span>
                          <span>· {l.quantite} unités</span>
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
                              Apports {formatEur(l.calcul.apports)} ·{" "}
                            </span>
                            <span
                              className={l.calcul.performance >= 0 ? "text-positive" : "text-negative"}
                            >
                              {l.calcul.performance >= 0 ? "+" : ""}
                              {formatEur(l.calcul.performance)}
                            </span>
                          </p>
                        )}
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
