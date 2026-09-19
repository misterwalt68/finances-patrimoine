"use client";

import { useActionState, useMemo, useState } from "react";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { MenuIcone } from "@/components/ui/menu-icone";
import { IconeMetal } from "@/lib/icones-actifs";
import { TYPES_ACTIF, METAUX_PHYSIQUES } from "@/lib/constants";
import { creerPosition } from "./actions";

type Actif = { id: string; libelle: string; type: string };
type Compte = { id: string; libelle: string; institutionId: string };
type Institution = { id: string; nom: string };

// La crypto se gère automatiquement via la synchronisation Coinbase — pas
// d'ajout manuel proposé pour cette famille.
const FAMILLES = TYPES_ACTIF.filter((t) => t.value !== "crypto");

export function FormulairePosition({
  listeActifs,
  listeComptes,
  listeInstitutions,
  onSuccess,
}: {
  listeActifs: Actif[];
  listeComptes: Compte[];
  listeInstitutions: Institution[];
  /** Appelé après un ajout réussi — permet au parent (ex. la modale) de se fermer. */
  onSuccess?: () => void;
}) {
  const [famille, setFamille] = useState("");
  const [metalSymbole, setMetalSymbole] = useState("");
  const [poids, setPoids] = useState("");
  const [prixAchatTotal, setPrixAchatTotal] = useState("");

  // Remet le formulaire à zéro après un ajout réussi, plutôt que de laisser
  // traîner les valeurs du dernier ajout — réinitialisé dans l'action elle-
  // même (pas un effet) puisque c'est en réponse à la soumission.
  const [, lancer] = useActionState(async (_etat: null, formData: FormData) => {
    await creerPosition(formData);
    setFamille("");
    setMetalSymbole("");
    setPoids("");
    setPrixAchatTotal("");
    onSuccess?.();
    return null;
  }, null);

  const institutionsParId = useMemo(
    () => new Map(listeInstitutions.map((i) => [i.id, i])),
    [listeInstitutions],
  );

  const estMetal = famille === "metal";
  const actifsDeLaFamille = listeActifs.filter((a) => a.type === famille);
  const peutSoumettre = estMetal ? metalSymbole !== "" : famille !== "" && actifsDeLaFamille.length > 0;

  const prixParGramme =
    estMetal && Number(poids) > 0 && Number(prixAchatTotal) > 0
      ? String(Number(prixAchatTotal) / Number(poids))
      : "";

  return (
    <Carte>
      <form action={lancer} className="space-y-3">
        <ChampSelect
          label="Qu'est-ce que tu souhaites ajouter ?"
          value={famille}
          onChange={(e) => {
            setFamille(e.target.value);
            setMetalSymbole("");
          }}
        >
          <option value="" disabled>
            Choisir une famille…
          </option>
          {FAMILLES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </ChampSelect>

        {famille === "" ? null : estMetal ? (
          <>
            <MenuIcone
              label="Quel métal ?"
              name="metalSymbole"
              value={metalSymbole}
              onChange={setMetalSymbole}
              options={METAUX_PHYSIQUES.map((m) => ({
                value: m.symbole,
                label: m.libelle + (m.sourcePrix === "manuel" ? " (cours manuel)" : ""),
                icone: <IconeMetal symbole={m.symbole} />,
              }))}
            />

            {metalSymbole && (
              <>
                <ChampSelect label="Type" name="note" required defaultValue="">
                  <option value="" disabled>
                    Choisir…
                  </option>
                  <option value="Pièce">Pièce</option>
                  <option value="Lingotin">Lingotin</option>
                  <option value="Bijou">Bijou</option>
                  <option value="Autre">Autre</option>
                </ChampSelect>
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
                <Champ label="Date d'achat" name="dateAcquisition" type="date" />
              </>
            )}
          </>
        ) : actifsDeLaFamille.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-muted">
            Aucun actif de ce type pour l&apos;instant — crée-le d&apos;abord dans les réglages.
          </p>
        ) : (
          <>
            <ChampSelect label="Actif" name="actifId" required defaultValue="">
              <option value="" disabled>
                Choisir…
              </option>
              {actifsDeLaFamille.map((a) => (
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

        {peutSoumettre && (
          <Bouton type="submit" className="w-full">
            Ajouter
          </Bouton>
        )}
      </form>
    </Carte>
  );
}
