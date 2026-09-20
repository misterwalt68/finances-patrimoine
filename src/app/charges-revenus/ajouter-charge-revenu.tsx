"use client";

import { useActionState, useState } from "react";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { TYPES_CHARGE_REVENU, PERIODICITES_CHARGE } from "@/lib/constants";
import { creerChargeRevenu } from "./actions";

type Personne = { id: string; libelle: string };

/**
 * "+" flottant façon patrimoine — le formulaire complet (type, libellé,
 * périodicité, personne, montant, infos pratiques) tenait auparavant en
 * plein milieu de la page ; en modale, l'écran reste centré sur la lecture
 * des lignes déjà là.
 */
export function AjouterChargeRevenu({ personnes }: { personnes: Personne[] }) {
  const [ouvert, setOuvert] = useState(false);

  const [, lancer] = useActionState(async (_etat: null, formData: FormData) => {
    await creerChargeRevenu(formData);
    setOuvert(false);
    return null;
  }, null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Ajouter une charge ou un revenu"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl font-medium leading-none text-accent-foreground shadow-lg shadow-black/40 ring-4 ring-accent/20 transition-transform active:scale-95 active:opacity-80"
      >
        +
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
          onClick={() => setOuvert(false)}
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-medium text-foreground">Ajouter une ligne</p>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                aria-label="Fermer"
                className="rounded p-1 text-muted transition-colors hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <Carte>
              <form action={lancer} className="space-y-3">
                <ChampSelect label="Type" name="type" required defaultValue="">
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {TYPES_CHARGE_REVENU.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </ChampSelect>
                <Champ label="Libellé" name="libelle" placeholder="Ex. Salaire, Eau, Taxe foncière…" required />
                <ChampSelect label="Périodicité" name="periodicite" required defaultValue="">
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {PERIODICITES_CHARGE.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </ChampSelect>
                <ChampSelect label="Personne" name="personneId" required defaultValue="">
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {personnes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.libelle}
                    </option>
                  ))}
                </ChampSelect>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Champ label="Montant (€)" name="montant" type="number" inputMode="decimal" step="any" required />
                  </div>
                  <div className="flex-1">
                    <Champ
                      label="Depuis le"
                      name="dateEffet"
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      required
                    />
                  </div>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm text-muted">Plus d&apos;options</summary>
                  <div className="mt-3 space-y-3">
                    <Champ label="Fournisseur (optionnel)" name="fournisseur" placeholder="Ex. Suez, Free…" />
                    <Champ label="Numéro client (optionnel)" name="numeroClient" />
                    <Champ label="Lien de suivi (optionnel)" name="lienSuivi" type="url" placeholder="https://…" />
                    <Champ label="Note (optionnel)" name="note" />
                  </div>
                </details>
                <Bouton type="submit" className="w-full">
                  Ajouter
                </Bouton>
              </form>
            </Carte>
          </div>
        </div>
      )}
    </>
  );
}
