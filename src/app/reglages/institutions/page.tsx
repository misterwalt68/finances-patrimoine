import { db } from "@/db";
import { institutions } from "@/db/schema";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { METHODES_CONNEXION, TYPES_INSTITUTION } from "@/lib/constants";
import { creerInstitution } from "./actions";

export default async function PageInstitutions() {
  const liste = await db.select().from(institutions).orderBy(institutions.createdAt);

  return (
    <div className="space-y-6 pt-2">
      <form action={creerInstitution} className="space-y-3">
        <Champ label="Nom" name="nom" placeholder="BoursoBank" required />
        <ChampSelect label="Type" name="type" required defaultValue="">
          <option value="" disabled>
            Choisir…
          </option>
          {TYPES_INSTITUTION.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </ChampSelect>
        <ChampSelect label="Connexion" name="methodeConnexion" required defaultValue="">
          <option value="" disabled>
            Choisir…
          </option>
          {METHODES_CONNEXION.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </ChampSelect>
        <Bouton type="submit">Ajouter</Bouton>
      </form>

      <ul className="divide-y divide-line rounded-lg border border-line">
        {liste.map((i) => (
          <li key={i.id} className="px-4 py-3">
            <p className="text-foreground">{i.nom}</p>
            <p className="text-sm text-muted">
              {i.type} · {i.methodeConnexion}
            </p>
          </li>
        ))}
        {liste.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">Aucun établissement pour l&apos;instant.</li>
        )}
      </ul>
    </div>
  );
}
