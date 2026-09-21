import { db } from "@/db";
import { categories } from "@/db/schema";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { Carte, Badge, ListeVide } from "@/components/ui/carte";
import { SelecteurIconeCategorie } from "@/components/ui/selecteur-icone";
import { IconeCategorie } from "@/lib/icones-categorie";
import { creerCategorie } from "./actions";

export default async function PageCategories() {
  const liste = await db.select().from(categories).orderBy(categories.createdAt);
  const parentsParId = new Map(liste.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <Carte>
        <form action={creerCategorie} className="space-y-3">
          <Champ label="Libellé" name="libelle" placeholder="Restaurants" required />
          <SelecteurIconeCategorie name="icone" />
          <ChampSelect label="Catégorie parente (optionnel)" name="parentId" defaultValue="">
            <option value="">Aucune — catégorie racine</option>
            {liste.map((c) => (
              <option key={c.id} value={c.id}>
                {c.libelle}
              </option>
            ))}
          </ChampSelect>
          <Bouton type="submit" className="w-full">
            Ajouter
          </Bouton>
        </form>
      </Carte>

      <div className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted">
          {liste.length} catégorie{liste.length > 1 ? "s" : ""}
        </h2>
        {liste.length === 0 ? (
          <ListeVide>Aucune catégorie pour l&apos;instant.</ListeVide>
        ) : (
          <Carte>
            <ul className="divide-y divide-line">
              {liste.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-accent">
                    <IconeCategorie icone={c.icone} className="h-[18px] w-[18px]" />
                  </span>
                  <p className="flex-1 font-medium text-foreground">{c.libelle}</p>
                  {c.parentId && <Badge>{parentsParId.get(c.parentId)?.libelle ?? "—"}</Badge>}
                </li>
              ))}
            </ul>
          </Carte>
        )}
      </div>
    </div>
  );
}
