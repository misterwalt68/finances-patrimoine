"use client";

import { useMemo, useState } from "react";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { creerPosition } from "./actions";

type Actif = { id: string; libelle: string; type: string };
type Compte = { id: string; libelle: string; institutionId: string };
type Institution = { id: string; nom: string };

export function FormulairePosition({
  listeActifs,
  listeComptes,
  listeInstitutions,
}: {
  listeActifs: Actif[];
  listeComptes: Compte[];
  listeInstitutions: Institution[];
}) {
  const [actifId, setActifId] = useState("");
  const [poids, setPoids] = useState("");
  const [prixAchatTotal, setPrixAchatTotal] = useState("");

  const institutionsParId = useMemo(
    () => new Map(listeInstitutions.map((i) => [i.id, i])),
    [listeInstitutions],
  );

  const actifSelectionne = listeActifs.find((a) => a.id === actifId);
  const estMetal = actifSelectionne?.type === "metal";

  const prixParGramme =
    estMetal && Number(poids) > 0 && Number(prixAchatTotal) > 0
      ? String(Number(prixAchatTotal) / Number(poids))
      : "";

  return (
    <Carte>
      <form action={creerPosition} className="space-y-3">
        <ChampSelect
          label="Qu'est-ce que tu ajoutes ?"
          name="actifId"
          required
          value={actifId}
          onChange={(e) => setActifId(e.target.value)}
        >
          <option value="" disabled>
            Choisir…
          </option>
          {listeActifs.map((a) => (
            <option key={a.id} value={a.id}>
              {a.libelle}
            </option>
          ))}
        </ChampSelect>

        <ChampSelect label="Compte" name="compteId" required defaultValue="">
          <option value="" disabled>
            Choisir…
          </option>
          {listeComptes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.libelle} · {institutionsParId.get(c.institutionId)?.nom}
            </option>
          ))}
        </ChampSelect>

        {estMetal ? (
          <>
            <Champ
              label="Poids (grammes)"
              name="quantite"
              type="number"
              inputMode="decimal"
              step="any"
              required
              value={poids}
              onChange={(e) => setPoids(e.target.value)}
            />
            <Champ
              label="Prix d'achat (€)"
              type="number"
              inputMode="decimal"
              step="any"
              value={prixAchatTotal}
              onChange={(e) => setPrixAchatTotal(e.target.value)}
            />
            <input type="hidden" name="prixRevientMoyen" value={prixParGramme} />
            <ChampSelect label="Type" name="note" defaultValue="">
              <option value="">Choisir…</option>
              <option value="Pièce">Pièce</option>
              <option value="Lingotin">Lingotin</option>
              <option value="Bijou">Bijou</option>
              <option value="Autre">Autre</option>
            </ChampSelect>
            <Champ label="Date d'achat" name="dateAcquisition" type="date" />
          </>
        ) : (
          <>
            <Champ
              label="Quantité"
              name="quantite"
              type="number"
              inputMode="decimal"
              step="any"
              required
            />
            <Champ
              label="Prix de revient moyen (€, optionnel)"
              name="prixRevientMoyen"
              type="number"
              inputMode="decimal"
              step="any"
            />
            <details>
              <summary className="cursor-pointer text-sm text-muted">Plus d&apos;options</summary>
              <div className="mt-3 space-y-3">
                <Champ label="Description (optionnel)" name="note" placeholder="Note libre…" />
                <Champ label="Date d'achat (optionnel)" name="dateAcquisition" type="date" />
              </div>
            </details>
          </>
        )}

        <Bouton type="submit" className="w-full">
          Ajouter
        </Bouton>
      </form>
    </Carte>
  );
}
