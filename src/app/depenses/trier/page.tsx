import Link from "next/link";
import { db } from "@/db";
import { transactions, categories, comptes, personnes } from "@/db/schema";
import { ListeVide } from "@/components/ui/carte";
import { TrieurDepenses } from "./trieur-depenses";
import { BoutonDecategoriserTout } from "./bouton-decategoriser-tout";

export default async function PageTrierDepenses() {
  const [toutesTransactions, listeCategories, listeComptes, listePersonnes] = await Promise.all([
    db.select().from(transactions).orderBy(transactions.createdAt),
    db.select().from(categories).orderBy(categories.libelle),
    db.select().from(comptes),
    db.select().from(personnes),
  ]);

  const personnesParId = new Map(listePersonnes.map((p) => [p.id, p]));
  const comptesParId = new Map(listeComptes.map((c) => [c.id, c]));
  function personneLibelle(compteId: string | null): string | null {
    const compte = compteId ? comptesParId.get(compteId) : undefined;
    return compte ? (personnesParId.get(compte.personneId)?.libelle ?? null) : null;
  }

  const pile = toutesTransactions
    .filter((t) => t.statut === "a_categoriser")
    .map((t) => ({
      id: t.id,
      commercant: t.commercant,
      montant: Number(t.montant),
      date: t.date,
      personneLibelle: personneLibelle(t.compteId),
    }));

  const compteurs: Record<string, number> = {};
  for (const t of toutesTransactions) {
    if (t.categorieId) compteurs[t.categorieId] = (compteurs[t.categorieId] ?? 0) + 1;
  }

  const categoriesAvecTransactions = listeCategories.map((c) => ({
    id: c.id,
    libelle: c.libelle,
    icone: c.icone,
    type: c.type === "revenu" ? ("revenu" as const) : ("charge" as const),
    transactions: toutesTransactions
      .filter((t) => t.categorieId === c.id)
      .map((t) => ({
        id: t.id,
        commercant: t.commercant,
        montant: Number(t.montant),
        date: t.date,
        personneLibelle: personneLibelle(t.compteId),
      })),
  }));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-safe pt-safe">
      <div className="flex pt-2">
        <BoutonDecategoriserTout />
      </div>
      <header className="py-6">
        <Link href="/depenses" className="text-sm text-muted transition-colors hover:text-foreground">
          ← Dépenses
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Rangement Transactions</h1>
      </header>

      {listeCategories.length === 0 ? (
        <ListeVide>
          Crée d&apos;abord une catégorie dans{" "}
          <Link href="/reglages/categories" className="text-accent">
            les réglages
          </Link>
          .
        </ListeVide>
      ) : (
        <TrieurDepenses
          pileInitiale={pile}
          categoriesInitiales={categoriesAvecTransactions}
          compteursInitiaux={compteurs}
        />
      )}
    </div>
  );
}
