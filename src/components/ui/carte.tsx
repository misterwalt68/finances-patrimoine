import type { ReactNode } from "react";

export function Carte({
  children,
  accent = false,
  className = "",
}: {
  children: ReactNode;
  /** Lueur discrète — réservée à la carte clé d'un écran (SPEC.md §9). */
  accent?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface p-4 ${accent ? "carte-accent" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-xs text-muted">
      {children}
    </span>
  );
}

export function ListeVide({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
      {children}
    </p>
  );
}
