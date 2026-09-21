"use client";

import { useMemo, useState } from "react";
import { IconeCategorie } from "@/lib/icones-categorie";
import { ICONES_CATEGORIE } from "@/lib/constants";

/**
 * Grille de pictogrammes — un tap règle un champ caché, aucun texte à
 * taper. Avec une centaine d'icônes désormais disponibles, un filtre texte
 * évite de faire défiler toute la liste pour en retrouver une précise.
 */
export function SelecteurIconeCategorie({
  name,
  defaultValue = "autre",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [valeur, setValeur] = useState(defaultValue);
  const [filtre, setFiltre] = useState("");

  const options = useMemo(() => {
    const recherche = filtre.trim().toLowerCase();
    if (!recherche) return ICONES_CATEGORIE;
    return ICONES_CATEGORIE.filter((o) => o.label.toLowerCase().includes(recherche));
  }, [filtre]);

  return (
    <div>
      <span className="mb-1 block text-sm text-muted">Icône</span>
      <input type="hidden" name={name} value={valeur} />
      <input
        type="text"
        value={filtre}
        onChange={(e) => setFiltre(e.target.value)}
        placeholder="Chercher une icône…"
        className="mb-2 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
      />
      <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border border-line p-2">
        {options.length === 0 ? (
          <p className="w-full py-2 text-center text-sm text-muted">Aucune icône pour « {filtre} ».</p>
        ) : (
          options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setValeur(o.value)}
              aria-label={o.label}
              aria-pressed={valeur === o.value}
              title={o.label}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
                valeur === o.value ? "border-accent bg-accent/10 text-accent" : "border-line text-muted"
              }`}
            >
              <IconeCategorie icone={o.value} className="h-5 w-5" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
