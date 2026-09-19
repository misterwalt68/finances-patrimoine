"use client";

import { useState } from "react";
import { supprimerPosition } from "./actions";

const MOT_CONFIRMATION = "SUPPRIMER";

export function SupprimerPositionBouton({ id, libelle }: { id: string; libelle: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);

  const peutConfirmer = saisie.trim().toUpperCase() === MOT_CONFIRMATION;

  function fermer() {
    setOuvert(false);
    setSaisie("");
  }

  async function confirmer() {
    setEnCours(true);
    await supprimerPosition(id);
    setEnCours(false);
    fermer();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label={`Supprimer ${libelle}`}
        className="rounded p-1 text-xs text-muted transition-colors hover:text-negative"
      >
        ✕
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={fermer}
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-line bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium text-foreground">Supprimer {libelle} ?</p>
            <p className="mt-1 text-sm text-muted">
              Cette action est irréversible. Tape{" "}
              <span className="font-mono text-foreground">{MOT_CONFIRMATION}</span> pour confirmer.
            </p>
            <input
              autoFocus
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder={MOT_CONFIRMATION}
              className="mt-3 h-11 w-full rounded-lg border border-line bg-background px-4 text-base text-foreground outline-none focus:border-accent"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={fermer}
                className="h-11 flex-1 rounded-lg border border-line text-sm text-foreground"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!peutConfirmer || enCours}
                onClick={confirmer}
                className="h-11 flex-1 rounded-lg bg-negative text-sm font-medium text-white disabled:opacity-40"
              >
                {enCours ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
