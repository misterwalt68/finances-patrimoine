import { Champ } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/carte";
import { categoriserTransaction, creerCategorieEtCategoriserSansRetour } from "./actions";

type Categorie = { id: string; libelle: string };

const formatEur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

/**
 * "Vu depuis" (createdAt) plutôt qu'un simple horodatage — c'est la donnée
 * qui permet à Maxime de constater lui-même le délai réel entre un paiement
 * et son apparition ici (aucune banque ne remonte en DSP2 aussi vite qu'un
 * paiement Apple Pay dans son propre relevé).
 */
function formatDepuis(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 48) return `il y a ${heures} h`;
  return `il y a ${Math.floor(heures / 24)} j`;
}

/**
 * Pas de glisser-déposer ni de micro pour l'instant (à venir) — un tap sur
 * une catégorie suffit à trier une transaction, chaque catégorie étant son
 * propre petit formulaire pour rester en HTML pur, sans JS côté client.
 */
export function LigneTransaction({
  transaction,
  compteLibelle,
  institutionNom,
  personneLibelle,
  categorieLibelle,
  categories,
}: {
  transaction: { id: string; date: string; commercant: string | null; montant: number; createdAt: string };
  compteLibelle?: string;
  institutionNom?: string;
  personneLibelle?: string;
  categorieLibelle: string | null;
  categories: Categorie[];
}) {
  const aCategoriser = categorieLibelle === null;

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{transaction.commercant ?? "Sans libellé"}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <span>{formatDate(transaction.date)}</span>
            {institutionNom && <Badge>{institutionNom}{compteLibelle ? ` · ${compteLibelle}` : ""}</Badge>}
            {personneLibelle && <Badge>{personneLibelle}</Badge>}
            {categorieLibelle && <Badge>{categorieLibelle}</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted">Vu {formatDepuis(transaction.createdAt)}</p>
        </div>
        <span className={`shrink-0 font-medium ${transaction.montant >= 0 ? "text-positive" : "text-foreground"}`}>
          {transaction.montant >= 0 ? "+" : ""}
          {formatEur(transaction.montant)}
        </span>
      </div>

      <details className="mt-2">
        <summary className={`cursor-pointer text-sm ${aCategoriser ? "text-accent" : "text-muted"}`}>
          {aCategoriser ? "Catégoriser" : "Modifier la catégorie"}
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <form key={c.id} action={categoriserTransaction}>
              <input type="hidden" name="transactionId" value={transaction.id} />
              <input type="hidden" name="categorieId" value={c.id} />
              <button
                type="submit"
                className="rounded-full border border-line px-3 py-1 text-sm text-foreground transition-colors hover:border-accent"
              >
                {c.libelle}
              </button>
            </form>
          ))}
        </div>
        <form action={creerCategorieEtCategoriserSansRetour} className="mt-2 flex gap-2">
          <input type="hidden" name="transactionId" value={transaction.id} />
          <input type="hidden" name="icone" value="autre" />
          <div className="flex-1">
            <Champ label="Nouvelle catégorie" name="libelle" placeholder="Ex. Vacances…" />
          </div>
          <Bouton type="submit" className="shrink-0">
            Créer
          </Bouton>
        </form>
      </details>
    </li>
  );
}
