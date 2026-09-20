"use client";

import { useState, type ReactNode } from "react";

/**
 * Cache la courbe d'historique derrière un bouton plutôt que de l'afficher
 * d'office — pour "Comptes" et "Fonds / unité de compte", où la lecture du
 * solde compte plus que la courbe (contrairement aux métaux, consultés
 * justement pour leur graphique). Fermé par défaut, à la demande de Maxime.
 */
export function GraphiqueDepliable({ children }: { children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="flex w-full items-center justify-end gap-1.5 px-4 py-2.5 text-xs text-muted transition-colors hover:text-foreground"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 13.5V2.5" strokeLinecap="round" />
          <path d="M2 13.5H14" strokeLinecap="round" />
          <path d="M3.5 11 6.5 7.5 9 9.5 12.5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {ouvert ? "Masquer le graphique" : "Afficher le graphique"}
      </button>
      {ouvert && children}
    </div>
  );
}
