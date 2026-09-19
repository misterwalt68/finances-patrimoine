import { db } from "@/db";
import { enveloppes } from "@/db/schema";
import { Champ } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { creerEnveloppe } from "./actions";

export default async function PageEnveloppes() {
  const liste = await db.select().from(enveloppes).orderBy(enveloppes.createdAt);

  return (
    <div className="space-y-6 pt-2">
      <form action={creerEnveloppe} className="space-y-3">
        <Champ label="Libellé" name="libelle" placeholder="PEA" required />
        <Champ
          label="Fiscalité (texte libre)"
          name="fiscaliteDescription"
          placeholder="Exonéré après 5 ans…"
        />
        <Champ
          label="Plafond (€, optionnel)"
          name="plafond"
          type="number"
          inputMode="decimal"
          step="0.01"
        />
        <Champ
          label="Durée de maturité (mois, optionnel)"
          name="dureeMaturiteMois"
          type="number"
          inputMode="numeric"
        />
        <Bouton type="submit">Ajouter</Bouton>
      </form>

      <ul className="divide-y divide-line rounded-lg border border-line">
        {liste.map((e) => (
          <li key={e.id} className="px-4 py-3">
            <p className="text-foreground">{e.libelle}</p>
            {e.fiscaliteDescription && (
              <p className="text-sm text-muted">{e.fiscaliteDescription}</p>
            )}
          </li>
        ))}
        {liste.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">Aucune enveloppe pour l&apos;instant.</li>
        )}
      </ul>
    </div>
  );
}
