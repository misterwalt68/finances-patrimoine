"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Personne = { id: string; libelle: string };

/**
 * Bascule toute la page entre Maxime, Amélie et Couple (agrégat des deux) —
 * via l'URL (`?personne=...`) plutôt qu'un état client, pour que le filtre
 * survive un rechargement et reste dans l'historique de navigation.
 */
export function SelecteurPersonne({
  personnes,
  personneActiveId,
}: {
  personnes: Personne[];
  personneActiveId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function changerPersonne(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("personne", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={personneActiveId}
      onChange={(e) => changerPersonne(e.target.value)}
      aria-label="Afficher le patrimoine de"
      className="h-9 rounded-full border border-line bg-surface px-3 text-sm text-foreground"
    >
      {personnes.map((p) => (
        <option key={p.id} value={p.id}>
          {p.libelle}
        </option>
      ))}
    </select>
  );
}
