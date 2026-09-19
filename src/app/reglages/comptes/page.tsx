import { db } from "@/db";
import { comptes, institutions, personnes, enveloppes } from "@/db/schema";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { Carte, Badge, ListeVide } from "@/components/ui/carte";
import { creerCompte } from "./actions";

export default async function PageComptes() {
  const [liste, listeInstitutions, listePersonnes, listeEnveloppes] = await Promise.all([
    db.select().from(comptes).orderBy(comptes.createdAt),
    db.select().from(institutions).orderBy(institutions.nom),
    db.select().from(personnes).orderBy(personnes.libelle),
    db.select().from(enveloppes).orderBy(enveloppes.libelle),
  ]);

  const institutionsParId = new Map(listeInstitutions.map((i) => [i.id, i]));
  const personnesParId = new Map(listePersonnes.map((p) => [p.id, p]));
  const enveloppesParId = new Map(listeEnveloppes.map((e) => [e.id, e]));

  const donneesInsuffisantes =
    listeInstitutions.length === 0 || listePersonnes.length === 0 || listeEnveloppes.length === 0;

  return (
    <div className="space-y-6">
      {donneesInsuffisantes ? (
        <ListeVide>Crée d&apos;abord au moins un établissement, une personne et une enveloppe.</ListeVide>
      ) : (
        <Carte>
          <form action={creerCompte} className="space-y-3">
            <Champ label="Libellé" name="libelle" placeholder="Compte courant" required />
            <ChampSelect label="Établissement" name="institutionId" required defaultValue="">
              <option value="" disabled>
                Choisir…
              </option>
              {listeInstitutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nom}
                </option>
              ))}
            </ChampSelect>
            <ChampSelect label="Personne" name="personneId" required defaultValue="">
              <option value="" disabled>
                Choisir…
              </option>
              {listePersonnes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.libelle}
                </option>
              ))}
            </ChampSelect>
            <ChampSelect label="Enveloppe" name="enveloppeId" required defaultValue="">
              <option value="" disabled>
                Choisir…
              </option>
              {listeEnveloppes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.libelle}
                </option>
              ))}
            </ChampSelect>
            <Champ label="Devise" name="devise" placeholder="EUR" defaultValue="EUR" />
            <Bouton type="submit" className="w-full">
              Ajouter
            </Bouton>
          </form>
        </Carte>
      )}

      <div className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted">
          {liste.length} compte{liste.length > 1 ? "s" : ""}
        </h2>
        {liste.length === 0 ? (
          <ListeVide>Aucun compte pour l&apos;instant.</ListeVide>
        ) : (
          <Carte>
            <ul className="divide-y divide-line">
              {liste.map((c) => (
                <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-medium text-foreground">{c.libelle}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge>{institutionsParId.get(c.institutionId)?.nom ?? "—"}</Badge>
                    <Badge>{enveloppesParId.get(c.enveloppeId)?.libelle ?? "—"}</Badge>
                    <Badge>{personnesParId.get(c.personneId)?.libelle ?? "—"}</Badge>
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
