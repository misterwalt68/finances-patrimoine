import { db } from "@/db";
import { categories } from "@/db/schema";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { creerCategorie } from "./actions";

export default async function PageCategories() {
  const liste = await db.select().from(categories).orderBy(categories.createdAt);
  const parentsParId = new Map(liste.map((c) => [c.id, c]));

  return (
    <div className="space-y-6 pt-2">
      <form action={creerCategorie} className="space-y-3">
        <Champ label="Libellé" name="libelle" placeholder="Restaurants" required />
        <ChampSelect label="Catégorie parente (optionnel)" name="parentId" defaultValue="">
          <option value="">Aucune — catégorie racine</option>
          {liste.map((c) => (
            <option key={c.id} value={c.id}>
              {c.libelle}
            </option>
          ))}
        </ChampSelect>
        <Bouton type="submit">Ajouter</Bouton>
      </form>

      <ul className="divide-y divide-line rounded-lg border border-line">
        {liste.map((c) => (
          <li key={c.id} className="px-4 py-3">
            <p className="text-foreground">{c.libelle}</p>
            {c.parentId && (
              <p className="text-sm text-muted">
                dans {parentsParId.get(c.parentId)?.libelle ?? "—"}
              </p>
            )}
          </li>
        ))}
        {liste.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">Aucune catégorie pour l&apos;instant.</li>
        )}
      </ul>
    </div>
  );
}
