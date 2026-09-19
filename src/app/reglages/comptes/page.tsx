import { db } from "@/db";
import { comptes, institutions, personnes, enveloppes } from "@/db/schema";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
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
    <div className="space-y-6 pt-2">
      {donneesInsuffisantes ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          Crée d&apos;abord au moins un établissement, une personne et une enveloppe.
        </p>
      ) : (
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
          <Bouton type="submit">Ajouter</Bouton>
        </form>
      )}

      <ul className="divide-y divide-line rounded-lg border border-line">
        {liste.map((c) => (
          <li key={c.id} className="px-4 py-3">
            <p className="text-foreground">{c.libelle}</p>
            <p className="text-sm text-muted">
              {institutionsParId.get(c.institutionId)?.nom ?? "—"} ·{" "}
              {enveloppesParId.get(c.enveloppeId)?.libelle ?? "—"} ·{" "}
              {personnesParId.get(c.personneId)?.libelle ?? "—"}
            </p>
          </li>
        ))}
        {liste.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">Aucun compte pour l&apos;instant.</li>
        )}
      </ul>
    </div>
  );
}
