"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Option = { value: string; label: string; icone: ReactNode };

/**
 * Un `<select>` natif ne peut pas afficher d'icône dans sa liste d'options
 * (limitation du navigateur, y compris sur iOS) — ce menu maison sert
 * uniquement quand l'icône fait partie de l'info utile (ex. distinguer les
 * métaux visuellement), pas par défaut à la place d'un select normal.
 */
export function MenuIcone({
  label,
  name,
  options,
  value,
  onChange,
  placeholder = "Choisir…",
}: {
  label: string;
  name?: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function surClicDehors(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", surClicDehors);
    return () => document.removeEventListener("mousedown", surClicDehors);
  }, []);

  const selection = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="flex h-11 w-full items-center gap-2 rounded-lg border border-line bg-surface px-4 text-left text-base text-foreground outline-none focus:border-accent"
      >
        {selection ? (
          <>
            {selection.icone}
            <span>{selection.label}</span>
          </>
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
        <span className="ml-auto text-muted">▾</span>
      </button>

      {ouvert && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOuvert(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-base text-foreground transition-colors hover:bg-background"
              >
                {o.icone}
                <span>{o.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
