import Link from "next/link";
import type { SVGProps } from "react";
import { db } from "@/db";
import { personnes, institutions, comptes, actifs, categories } from "@/db/schema";
import { getUser } from "@/lib/supabase/server";
import { Carte } from "@/components/ui/carte";
import { deconnexion } from "./actions";

function Icone(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

const icones = {
  personnes: (p: SVGProps<SVGSVGElement>) => (
    <Icone {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </Icone>
  ),
  institutions: (p: SVGProps<SVGSVGElement>) => (
    <Icone {...p}>
      <path d="M3 10 12 4l9 6" />
      <path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9" />
      <path d="M3 19h18" />
    </Icone>
  ),
  comptes: (p: SVGProps<SVGSVGElement>) => (
    <Icone {...p}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14" r="1" fill="currentColor" stroke="none" />
    </Icone>
  ),
  actifs: (p: SVGProps<SVGSVGElement>) => (
    <Icone {...p}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15l3-4 3 2 4-6" />
    </Icone>
  ),
  categories: (p: SVGProps<SVGSVGElement>) => (
    <Icone {...p}>
      <path d="M12 3v7L19 18a2.2 2.2 0 0 1-3 3L8 13.5V3" />
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
    </Icone>
  ),
} as const;

export default async function PageAccueil() {
  const [user, nbPersonnes, nbInstitutions, nbComptes, nbActifs, nbCategories] = await Promise.all([
    getUser(),
    db.$count(personnes),
    db.$count(institutions),
    db.$count(comptes),
    db.$count(actifs),
    db.$count(categories),
  ]);

  const stats = [
    { label: "Personnes", n: nbPersonnes, icone: icones.personnes },
    { label: "Établissements", n: nbInstitutions, icone: icones.institutions },
    { label: "Comptes", n: nbComptes, icone: icones.comptes },
    { label: "Actifs", n: nbActifs, icone: icones.actifs },
    { label: "Catégories", n: nbCategories, icone: icones.categories },
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-safe pt-safe">
      <header className="flex items-center justify-between py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Bonjour <span className="text-accent">Maxime</span>
          </h1>
          <p className="text-sm text-muted">Ta liberté financière commence ici.</p>
        </div>
        <form action={deconnexion}>
          <button type="submit" className="text-sm text-muted transition-colors hover:text-foreground">
            Déconnexion
          </button>
        </form>
      </header>

      <Carte accent>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Ta vie te coûte</p>
          <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted">
            À venir · lots 1-3
          </span>
        </div>
        <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
          — €<span className="text-lg font-normal text-muted"> / jour</span>
        </p>
        <p className="mt-3 text-sm text-muted">
          Connecté en tant que {user?.email ?? "toi"}.
        </p>
      </Carte>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Carte key={s.label}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-accent">
              <s.icone className="h-[18px] w-[18px]" />
            </span>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{s.n}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </Carte>
        ))}
      </div>

      <Link
        href="/reglages"
        className="mt-6 flex h-11 items-center justify-center rounded-lg bg-accent text-base font-medium text-accent-foreground transition-opacity active:opacity-80"
      >
        Aller aux réglages
      </Link>
    </main>
  );
}
