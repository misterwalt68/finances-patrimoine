import { db } from "@/db";
import { enveloppes } from "@/db/schema";
import { Champ } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { Carte, Badge, ListeVide } from "@/components/ui/carte";
import { creerEnveloppe } from "./actions";

export default async function PageEnveloppes() {
  const liste = await db.select().from(enveloppes).orderBy(enveloppes.createdAt);

  return (
    <div className="space-y-6">
      <Carte>
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
          <Bouton type="submit" className="w-full">
            Ajouter
          </Bouton>
        </form>
      </Carte>

      <div className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted">
          {liste.length} enveloppe{liste.length > 1 ? "s" : ""}
        </h2>
        {liste.length === 0 ? (
          <ListeVide>Aucune enveloppe pour l&apos;instant.</ListeVide>
        ) : (
          <Carte>
            <ul className="divide-y divide-line">
              {liste.map((e) => (
                <li key={e.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{e.libelle}</p>
                    {e.plafond && <Badge>{Number(e.plafond).toLocaleString("fr-FR")} €</Badge>}
                  </div>
                  {e.fiscaliteDescription && (
                    <p className="mt-1 text-sm text-muted">{e.fiscaliteDescription}</p>
                  )}
                </li>
              ))}
            </ul>
          </Carte>
        )}
      </div>
    </div>
  );
}
