import { db } from "@/db";
import { personnes } from "@/db/schema";
import { Champ } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { creerPersonne } from "./actions";

export default async function PagePersonnes() {
  const liste = await db.select().from(personnes).orderBy(personnes.createdAt);

  return (
    <div className="space-y-6 pt-2">
      <form action={creerPersonne} className="space-y-3">
        <Champ label="Nom" name="libelle" placeholder="Amélie" required />
        <Bouton type="submit">Ajouter</Bouton>
      </form>

      <ul className="divide-y divide-line rounded-lg border border-line">
        {liste.map((p) => (
          <li key={p.id} className="px-4 py-3 text-foreground">
            {p.libelle}
          </li>
        ))}
        {liste.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">Aucune personne pour l&apos;instant.</li>
        )}
      </ul>
    </div>
  );
}
