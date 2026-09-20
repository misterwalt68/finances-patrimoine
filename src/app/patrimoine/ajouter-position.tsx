"use client";

import { useState } from "react";
import { FormulairePosition } from "./formulaire-position";

type Actif = { id: string; libelle: string; type: string };
type Compte = { id: string; libelle: string; institutionId: string };
type Institution = { id: string; nom: string };

/**
 * Le "+" du header ouvre le formulaire d'ajout en modale plutôt que de
 * l'afficher en permanence sur la page — demande explicite de Maxime pour
 * garder l'écran principal centré sur la lecture du patrimoine.
 */
export function AjouterPosition({
  listeActifs,
  listeComptes,
  listeInstitutions,
  personneActiveId,
}: {
  listeActifs: Actif[];
  listeComptes: Compte[];
  listeInstitutions: Institution[];
  personneActiveId: string;
}) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Ajouter au patrimoine"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl font-medium leading-none text-accent-foreground shadow-lg shadow-black/40 ring-4 ring-accent/20 transition-transform active:scale-95 active:opacity-80"
      >
        +
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setOuvert(false)}
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-medium text-foreground">Ajouter au patrimoine</p>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                aria-label="Fermer"
                className="rounded p-1 text-muted transition-colors hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <FormulairePosition
              listeActifs={listeActifs}
              listeComptes={listeComptes}
              listeInstitutions={listeInstitutions}
              personneActiveId={personneActiveId}
              onSuccess={() => setOuvert(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
