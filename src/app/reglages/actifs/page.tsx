import { db } from "@/db";
import { actifs } from "@/db/schema";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { SOURCES_PRIX, TYPES_ACTIF } from "@/lib/constants";
import { creerActif } from "./actions";

export default async function PageActifs() {
  const liste = await db.select().from(actifs).orderBy(actifs.createdAt);

  return (
    <div className="space-y-6 pt-2">
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
        <Bouton type="submit">Ajouter</Bouton>
      </form>

      <ul className="divide-y divide-line rounded-lg border border-line">
        {liste.map((a) => (
          <li key={a.id} className="px-4 py-3">
            <p className="text-foreground">{a.libelle}</p>
            <p className="text-sm text-muted">
              {a.type} · {a.sourcePrix}
            </p>
          </li>
        ))}
        {liste.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">Aucun actif pour l&apos;instant.</li>
        )}
      </ul>
    </div>
  );
}
