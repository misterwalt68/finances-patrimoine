import { db } from "@/db";
import { institutions } from "@/db/schema";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { Carte, Badge, ListeVide } from "@/components/ui/carte";
import { METHODES_CONNEXION, TYPES_INSTITUTION } from "@/lib/constants";
import { creerInstitution } from "./actions";

const libelleType = (v: string) => TYPES_INSTITUTION.find((t) => t.value === v)?.label ?? v;
const libelleMethode = (v: string) => METHODES_CONNEXION.find((m) => m.value === v)?.label ?? v;

export default async function PageInstitutions() {
  const liste = await db.select().from(institutions).orderBy(institutions.createdAt);

  return (
    <div className="space-y-6">
      <Carte>
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
          <Bouton type="submit" className="w-full">
            Ajouter
          </Bouton>
        </form>
      </Carte>

      <div className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted">
          {liste.length} établissement{liste.length > 1 ? "s" : ""}
        </h2>
        {liste.length === 0 ? (
          <ListeVide>Aucun établissement pour l&apos;instant.</ListeVide>
        ) : (
          <Carte>
            <ul className="divide-y divide-line">
              {liste.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <p className="font-medium text-foreground">{i.nom}</p>
                  <div className="flex shrink-0 gap-1.5">
                    <Badge>{libelleType(i.type)}</Badge>
                    <Badge>{libelleMethode(i.methodeConnexion)}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Carte>
        )}
      </div>
    </div>
  );
}
