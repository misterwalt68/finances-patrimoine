import { db } from "@/db";
import { comptes, institutions, personnes, enveloppes } from "@/db/schema";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { Carte, Badge, ListeVide } from "@/components/ui/carte";
import { creerCompte, relierCompteExistant } from "./actions";

type CompteBancaireExterne = { uid: string; nom: string | null; iban: string | null; devise: string | null };

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

  // Comptes vus par une connexion DSP2 (compte courant, carte…) mais jamais
  // rattachés à un compte du patrimoine — jusqu'ici, cette liaison ne
  // pouvait se faire que par un script ponctuel. "Relier" pré-remplit
  // l'établissement et l'identifiant externe ; il ne reste qu'à choisir la
  // personne et l'enveloppe.
  const comptesExternesNonRelies = listeInstitutions.flatMap((institution) => {
    const comptesExternes = (institution.enableBankingComptes as CompteBancaireExterne[] | null) ?? [];
    return comptesExternes
      .filter((ce) => !liste.some((c) => c.enableBankingAccountId === ce.uid))
      .map((ce) => ({ ...ce, institutionId: institution.id, institutionNom: institution.nom }));
  });

  // Candidats à "relier" plutôt que "créer" — un compte du patrimoine déjà
  // existant (ex. "Compte commun", créé à la main) mais sans connexion DSP2.
  const comptesSansConnexion = liste.filter((c) => !c.enableBankingAccountId);

  return (
    <div className="space-y-6">
      {comptesExternesNonRelies.length > 0 && (
        <Carte>
          <p className="font-medium text-foreground">Comptes détectés, pas encore ajoutés</p>
          <p className="mt-1 text-sm text-muted">
            Vus via une connexion bancaire, mais pas encore rattachés à une personne — déplie et choisis à qui
            ce compte appartient. Il apparaîtra ensuite tout seul dans le patrimoine (catégorie Cash), sans
            étape supplémentaire.
          </p>
          <ul className="mt-3 space-y-2">
            {comptesExternesNonRelies.map((ce) => (
              <li key={ce.uid}>
                <details className="rounded-lg border border-line">
                  <summary className="cursor-pointer list-none px-3 py-2.5 text-sm">
                    <span className="font-medium text-foreground">{ce.nom ?? "Compte sans nom"}</span>
                    <span className="text-muted">
                      {" "}
                      · {ce.institutionNom}
                      {ce.iban ? ` · ${ce.iban}` : ""}
                    </span>
                  </summary>
                  <form action={creerCompte} className="space-y-3 border-t border-line p-3">
                    <input type="hidden" name="institutionId" value={ce.institutionId} />
                    <input type="hidden" name="enableBankingAccountId" value={ce.uid} />
                    <input type="hidden" name="devise" value={ce.devise ?? "EUR"} />
                    <Champ label="Libellé" name="libelle" defaultValue={ce.nom ?? ""} required />
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
                    <Bouton type="submit" className="w-full">
                      Ajouter ce compte
                    </Bouton>
                  </form>
                  {comptesSansConnexion.length > 0 && (
                    <form
                      action={relierCompteExistant}
                      className="space-y-3 border-t border-line p-3"
                    >
                      <input type="hidden" name="enableBankingAccountId" value={ce.uid} />
                      <ChampSelect
                        label="…ou relier à un compte déjà existant"
                        name="compteId"
                        required
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Choisir…
                        </option>
                        {comptesSansConnexion.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.libelle} · {personnesParId.get(c.personneId)?.libelle}
                          </option>
                        ))}
                      </ChampSelect>
                      <Bouton type="submit" className="w-full">
                        Relier à ce compte
                      </Bouton>
                    </form>
                  )}
                </details>
              </li>
            ))}
          </ul>
        </Carte>
      )}

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
                    {c.enableBankingAccountId && <Badge>DSP2</Badge>}
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
