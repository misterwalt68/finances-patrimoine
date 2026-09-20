import Link from "next/link";
import { db } from "@/db";
import { chargesRevenus, chargesRevenusHistorique, personnes } from "@/db/schema";
import { Carte, ListeVide } from "@/components/ui/carte";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { TYPES_CHARGE_REVENU, PERIODICITES_CHARGE } from "@/lib/constants";
import { creerChargeRevenu } from "./actions";
import { GraphiqueComparaisonMensuelle } from "./graphique-comparaison";
import { LigneChargeRevenu } from "./ligne-charge-revenu";

// Même ordre d'affichage que le reste de l'app (patrimoine) — Maxime et
// Amélie d'abord, Couple ensuite.
const PRIORITE_PERSONNE: Record<string, number> = { Maxime: 0, Amélie: 1, Couple: 2 };

export default async function PageBudget() {
  const [listeCharges, listeHistorique, listePersonnes] = await Promise.all([
    db.select().from(chargesRevenus).orderBy(chargesRevenus.libelle),
    db.select().from(chargesRevenusHistorique).orderBy(chargesRevenusHistorique.dateEffet),
    db.select().from(personnes).orderBy(personnes.libelle),
  ]);

  const personnesTriees = [...listePersonnes].sort(
    (a, b) => (PRIORITE_PERSONNE[a.libelle] ?? 99) - (PRIORITE_PERSONNE[b.libelle] ?? 99),
  );
  const personnesParId = new Map(listePersonnes.map((p) => [p.id, p]));

  const historiqueParCharge = new Map<string, { montant: number; dateEffet: string; createdAt: Date }[]>();
  for (const h of listeHistorique) {
    const liste = historiqueParCharge.get(h.chargeRevenuId) ?? [];
    liste.push({ montant: Number(h.montant), dateEffet: h.dateEffet, createdAt: h.createdAt });
    historiqueParCharge.set(h.chargeRevenuId, liste);
  }

  const lignes = listeCharges.map((c) => {
    const historique = historiqueParCharge.get(c.id) ?? [];
    // Le départage par date de création évite qu'un ex-aequo sur la date
    // d'effet (deux corrections le même jour) ne retienne arbitrairement la
    // mauvaise valeur comme "dernier montant connu".
    const dernier = [...historique].sort(
      (a, b) => b.dateEffet.localeCompare(a.dateEffet) || b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];
    const dernierMontant = dernier?.montant ?? 0;
    const montantMensualise = c.periodicite === "annuel" ? dernierMontant / 12 : dernierMontant;
    return { charge: c, historique, dernierMontant, montantMensualise };
  });

  // Plus grosse ligne en premier, dans chaque groupe — même logique que le
  // patrimoine (la liste sert à repérer vite les gros postes).
  const revenus = lignes.filter((l) => l.charge.type === "revenu").sort((a, b) => b.montantMensualise - a.montantMensualise);
  const charges = lignes.filter((l) => l.charge.type === "charge").sort((a, b) => b.montantMensualise - a.montantMensualise);

  const totalRevenus = revenus.reduce((s, l) => s + l.montantMensualise, 0);
  const totalCharges = charges.reduce((s, l) => s + l.montantMensualise, 0);

  const donneesInsuffisantes = personnesTriees.length === 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-safe pt-safe">
      <header className="py-6">
        <Link href="/" className="text-sm text-muted transition-colors hover:text-foreground">
          ← Accueil
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Budget</h1>
      </header>

      {donneesInsuffisantes ? (
        <ListeVide>
          Crée d&apos;abord au moins une personne dans les{" "}
          <Link href="/reglages/personnes" className="text-accent">
            réglages
          </Link>
          .
        </ListeVide>
      ) : (
        <>
          {(revenus.length > 0 || charges.length > 0) && (
            <Carte accent className="mb-4">
              <GraphiqueComparaisonMensuelle revenus={totalRevenus} charges={totalCharges} />
            </Carte>
          )}

          <Carte className="mb-4">
            <p className="mb-3 font-medium text-foreground">Ajouter une ligne</p>
            <form action={creerChargeRevenu} className="space-y-3">
              <ChampSelect label="Type" name="type" required defaultValue="">
                <option value="" disabled>
                  Choisir…
                </option>
                {TYPES_CHARGE_REVENU.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </ChampSelect>
              <Champ label="Libellé" name="libelle" placeholder="Ex. Salaire, Eau, Taxe foncière…" required />
              <ChampSelect label="Périodicité" name="periodicite" required defaultValue="">
                <option value="" disabled>
                  Choisir…
                </option>
                {PERIODICITES_CHARGE.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </ChampSelect>
              <ChampSelect label="Personne" name="personneId" required defaultValue="">
                <option value="" disabled>
                  Choisir…
                </option>
                {personnesTriees.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.libelle}
                  </option>
                ))}
              </ChampSelect>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Champ label="Montant (€)" name="montant" type="number" inputMode="decimal" step="any" required />
                </div>
                <div className="flex-1">
                  <Champ
                    label="Depuis le"
                    name="dateEffet"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
              </div>
              <details>
                <summary className="cursor-pointer text-sm text-muted">Plus d&apos;options</summary>
                <div className="mt-3 space-y-3">
                  <Champ label="Fournisseur (optionnel)" name="fournisseur" placeholder="Ex. Suez, Free…" />
                  <Champ label="Numéro client (optionnel)" name="numeroClient" />
                  <Champ label="Lien de suivi (optionnel)" name="lienSuivi" type="url" placeholder="https://…" />
                  <Champ label="Note (optionnel)" name="note" />
                </div>
              </details>
              <Bouton type="submit" className="w-full">
                Ajouter
              </Bouton>
            </form>
          </Carte>

          <div className="space-y-4">
            <div>
              <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted">
                Revenus {revenus.length > 0 && <span>· {revenus.length}</span>}
              </h2>
              {revenus.length === 0 ? (
                <ListeVide>Aucun revenu pour l&apos;instant.</ListeVide>
              ) : (
                <Carte>
                  <ul className="divide-y divide-line">
                    {revenus.map((l) => (
                      <LigneChargeRevenu
                        key={l.charge.id}
                        charge={l.charge}
                        montantMensualise={l.montantMensualise}
                        dernierMontant={l.dernierMontant}
                        historique={l.historique}
                        personnes={personnesTriees}
                        personneLibelle={personnesParId.get(l.charge.personneId)?.libelle ?? "—"}
                      />
                    ))}
                  </ul>
                </Carte>
              )}
            </div>

            <div>
              <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted">
                Charges {charges.length > 0 && <span>· {charges.length}</span>}
              </h2>
              {charges.length === 0 ? (
                <ListeVide>Aucune charge pour l&apos;instant.</ListeVide>
              ) : (
                <Carte>
                  <ul className="divide-y divide-line">
                    {charges.map((l) => (
                      <LigneChargeRevenu
                        key={l.charge.id}
                        charge={l.charge}
                        montantMensualise={l.montantMensualise}
                        dernierMontant={l.dernierMontant}
                        historique={l.historique}
                        personnes={personnesTriees}
                        personneLibelle={personnesParId.get(l.charge.personneId)?.libelle ?? "—"}
                      />
                    ))}
                  </ul>
                </Carte>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
