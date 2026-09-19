import { db } from "@/db";
import { actifs } from "@/db/schema";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { Carte, Badge, ListeVide } from "@/components/ui/carte";
import { SOURCES_PRIX, TYPES_ACTIF } from "@/lib/constants";
import { creerActif } from "./actions";

const libelleType = (v: string) => TYPES_ACTIF.find((t) => t.value === v)?.label ?? v;
const libelleSource = (v: string) => SOURCES_PRIX.find((s) => s.value === v)?.label ?? v;

export default async function PageActifs() {
  const liste = await db.select().from(actifs).orderBy(actifs.createdAt);

  return (
    <div className="space-y-6">
      <Carte>
        <form action={creerActif} className="space-y-3">
          <Champ label="Libellé" name="libelle" placeholder="Solana" required />
          <ChampSelect label="Type" name="type" required defaultValue="">
            <option value="" disabled>
              Choisir…
            </option>
            {TYPES_ACTIF.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </ChampSelect>
          <Champ
            label="Identifiant externe (ISIN, ticker, symbole…)"
            name="identifiantExterne"
            placeholder="SOL"
          />
          <ChampSelect label="Source de prix" name="sourcePrix" required defaultValue="">
            <option value="" disabled>
              Choisir…
            </option>
            {SOURCES_PRIX.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </ChampSelect>
          <Champ
            label="Identifiant dans cette source"
            name="identifiantSource"
            placeholder="solana"
          />
          <Champ label="Devise" name="devise" placeholder="EUR" defaultValue="EUR" />
          <Bouton type="submit" className="w-full">
            Ajouter
          </Bouton>
        </form>
      </Carte>

      <div className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted">
          {liste.length} actif{liste.length > 1 ? "s" : ""}
        </h2>
        {liste.length === 0 ? (
          <ListeVide>Aucun actif pour l&apos;instant.</ListeVide>
        ) : (
          <Carte>
            <ul className="divide-y divide-line">
              {liste.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-foreground">{a.libelle}</p>
                    {a.identifiantExterne && (
                      <p className="text-sm text-muted">{a.identifiantExterne}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Badge>{libelleType(a.type)}</Badge>
                    <Badge>{libelleSource(a.sourcePrix)}</Badge>
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
