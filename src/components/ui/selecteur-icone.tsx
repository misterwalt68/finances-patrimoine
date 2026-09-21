"use client";

import { useState } from "react";
import { IconeCategorie } from "@/lib/icones-categorie";
import { OPTIONS_ICONE_CATEGORIE } from "@/lib/icones-categorie";

/** Grille de pictogrammes — un tap règle un champ caché, aucun texte à taper. */
export function SelecteurIconeCategorie({
  name,
  defaultValue = "autre",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [valeur, setValeur] = useState(defaultValue);
  return (
    <div>
      <span className="mb-1 block text-sm text-muted">Icône</span>
      <input type="hidden" name={name} value={valeur} />
      <div className="flex flex-wrap gap-2">
        {OPTIONS_ICONE_CATEGORIE.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setValeur(o.value)}
            aria-label={o.label}
            aria-pressed={valeur === o.value}
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
              valeur === o.value ? "border-accent bg-accent/10 text-accent" : "border-line text-muted"
            }`}
          >
            <IconeCategorie icone={o.value} className="h-5 w-5" />
          </button>
        ))}
      </div>
    </div>
  );
}
