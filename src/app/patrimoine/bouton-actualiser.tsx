"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Remplace le geste "tirer pour actualiser" (peu fiable selon Maxime, geste
 * tactile reconstruit à la main pour contourner les limites du pull-to-
 * refresh natif en PWA installée) par un simple bouton — moins "app native",
 * mais qui marche à coup sûr.
 */
export function BoutonActualiser({ action }: { action: () => Promise<void> }) {
  const [enCours, setEnCours] = useState(false);
  const router = useRouter();

  async function lancer() {
    setEnCours(true);
    try {
      await action();
      router.refresh();
    } finally {
      setEnCours(false);
    }
  }

  return (
    <button
      type="button"
      onClick={lancer}
      disabled={enCours}
      aria-label="Actualiser les données"
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-5 w-5 ${enCours ? "animate-spin" : ""}`}
      >
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4v5h-5" />
      </svg>
    </button>
  );
}
