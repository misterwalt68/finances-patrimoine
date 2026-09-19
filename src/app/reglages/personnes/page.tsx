import { db } from "@/db";
import { personnes } from "@/db/schema";
import { Champ } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { Carte, ListeVide } from "@/components/ui/carte";
import { creerPersonne } from "./actions";

export default async function PagePersonnes() {
  const liste = await db.select().from(personnes).orderBy(personnes.createdAt);

  return (
    <div className="space-y-6">
      <Carte>
        <form action={creerPersonne} className="space-y-3">
          <Champ label="Nom" name="libelle" placeholder="Amélie" required />
          <Bouton type="submit" className="w-full">
            Ajouter
          </Bouton>
        </form>
      </Carte>

      <div className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted">
          {liste.length} personne{liste.length > 1 ? "s" : ""}
        </h2>
        {liste.length === 0 ? (
          <ListeVide>Aucune personne pour l&apos;instant.</ListeVide>
        ) : (
          <Carte>
            <ul className="divide-y divide-line">
              {liste.map((p) => (
                <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-medium text-foreground">{p.libelle}</p>
                </li>
              ))}
            </ul>
          </Carte>
        )}
      </div>
    </div>
  );
}
