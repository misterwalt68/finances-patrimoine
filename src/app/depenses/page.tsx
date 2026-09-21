import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { transactions, comptes, institutions, personnes, categories } from "@/db/schema";
import { Carte, ListeVide } from "@/components/ui/carte";
import { BoutonActualiser } from "@/app/patrimoine/bouton-actualiser";
import { actualiserTransactions } from "./actions";
import { LigneTransaction } from "./ligne-transaction";

export default async function PageDepenses() {
  const [listeTransactions, listeComptes, listeInstitutions, listePersonnes, listeCategories] = await Promise.all([
    // Triées par date d'IMPORT (createdAt), pas la date de l'opération — les
    // transactions fraîchement synchronisées remontent en tête, à la fois
    // pour les catégoriser en premier et pour vérifier le délai réel entre
    // un paiement et son apparition ici (demande explicite de Maxime).
    db.select().from(transactions).orderBy(desc(transactions.createdAt)),
    db.select().from(comptes),
    db.select().from(institutions),
    db.select().from(personnes),
    db.select().from(categories).orderBy(categories.libelle),
  ]);

  const comptesParId = new Map(listeComptes.map((c) => [c.id, c]));
  const institutionsParId = new Map(listeInstitutions.map((i) => [i.id, i]));
  const personnesParId = new Map(listePersonnes.map((p) => [p.id, p]));
  const categoriesParId = new Map(listeCategories.map((c) => [c.id, c]));

  const lignes = listeTransactions.map((t) => {
    const compte = t.compteId ? comptesParId.get(t.compteId) : undefined;
    const institution = compte ? institutionsParId.get(compte.institutionId) : undefined;
    const personne = compte ? personnesParId.get(compte.personneId) : undefined;
    const categorie = t.categorieId ? categoriesParId.get(t.categorieId) : undefined;
    return { transaction: t, compte, institution, personne, categorie };
  });

  const nbACategoriser = lignes.filter((l) => l.transaction.statut === "a_categoriser").length;
  const donneesInsuffisantes = listeComptes.every((c) => !c.enableBankingAccountId);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-safe pt-safe">
      <header className="flex items-center justify-between py-6">
        <div>
          <Link href="/" className="text-sm text-muted transition-colors hover:text-foreground">
            ← Accueil
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Dépenses</h1>
        </div>
        <BoutonActualiser action={actualiserTransactions} />
      </header>

      {donneesInsuffisantes ? (
        <ListeVide>
          Aucun compte relié en DSP2 pour l&apos;instant — relie une banque dans{" "}
          <Link href="/reglages/connexions" className="text-accent">
            Réglages → Connexions
          </Link>
          .
        </ListeVide>
      ) : (
        <>
          {nbACategoriser > 0 && (
            <Link href="/depenses/trier" className="mb-4 block">
              <Carte accent className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">À catégoriser</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{nbACategoriser}</p>
                </div>
                <span className="text-muted" aria-hidden>
                  ›
                </span>
              </Carte>
            </Link>
          )}

          {lignes.length === 0 ? (
            <ListeVide>Aucune transaction pour l&apos;instant — actualise pour aller chercher les premières.</ListeVide>
          ) : (
            <Carte>
              <ul className="divide-y divide-line">
                {lignes.map((l) => (
                  <LigneTransaction
                    key={l.transaction.id}
                    transaction={{
                      id: l.transaction.id,
                      date: l.transaction.date,
                      commercant: l.transaction.commercant,
                      montant: Number(l.transaction.montant),
                      createdAt: l.transaction.createdAt.toISOString(),
                    }}
                    compteLibelle={l.compte?.libelle}
                    institutionNom={l.institution?.nom}
                    personneLibelle={l.personne?.libelle}
                    categorieLibelle={l.categorie?.libelle ?? null}
                    categories={listeCategories.filter((c) =>
                      Number(l.transaction.montant) >= 0 ? c.type === "revenu" : c.type === "charge",
                    )}
                  />
                ))}
              </ul>
            </Carte>
          )}
        </>
      )}
    </div>
  );
}
