"use client";

import { useState } from "react";
import { decategoriserTout } from "../actions";

/**
 * Outil de développement — pas destiné à Maxime en usage normal, juste pour
 * retester le tri. Rechargement complet plutôt que `router.refresh()` :
 * l'état local de la pile/des compteurs dans `TrieurDepenses` ne se
 * resynchronise pas tout seul avec les nouvelles props d'un simple refresh
 * une fois le composant déjà monté — sans intérêt de le corriger proprement
 * pour un bouton de test.
 */
export function BoutonDecategoriserTout() {
  const [enCours, setEnCours] = useState(false);

  async function lancer() {
    setEnCours(true);
    await decategoriserTout();
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={lancer}
      disabled={enCours}
      className="mb-2 self-start rounded-full border border-dashed border-negative/50 px-3 py-1 text-xs text-negative disabled:opacity-50"
    >
      {enCours ? "Décatégorisation…" : "Dev — décatégoriser toutes les dépenses"}
    </button>
  );
}
