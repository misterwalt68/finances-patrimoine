import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { Carte } from "@/components/ui/carte";
import { deconnexion } from "./actions";

export default async function PageAccueil() {
  const user = await getUser();

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

      <Link
        href="/patrimoine"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors active:bg-background"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M12 3v9l6.4 6.4" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>
        <span className="flex-1">
          <span className="block font-medium text-foreground">Patrimoine</span>
          <span className="block text-sm text-muted">Répartition, évolution, tous les comptes</span>
        </span>
        <span className="text-muted" aria-hidden>
          ›
        </span>
      </Link>

      <Link
        href="/charges-revenus"
        className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors active:bg-background"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <rect x="3" y="6" width="18" height="13" rx="2" />
            <path d="M3 10h18" />
            <path d="M7 15h4" />
          </svg>
        </span>
        <span className="flex-1">
          <span className="block font-medium text-foreground">Charges & revenus</span>
          <span className="block text-sm text-muted">Ce qui rentre et sort chaque mois, en fixe</span>
        </span>
        <span className="text-muted" aria-hidden>
          ›
        </span>
      </Link>

      <Link
        href="/depenses"
        className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors active:bg-background"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M4 19V5" />
            <path d="M4 19h16" />
            <path d="M8 15l3-4 3 2 4-6" />
          </svg>
        </span>
        <span className="flex-1">
          <span className="block font-medium text-foreground">Dépenses</span>
          <span className="block text-sm text-muted">Transactions du quotidien, à catégoriser</span>
        </span>
        <span className="text-muted" aria-hidden>
          ›
        </span>
      </Link>

      <Link
        href="/reglages"
        className="mt-3 flex h-11 items-center justify-center rounded-lg border border-line text-base font-medium text-foreground transition-colors hover:border-muted"
      >
        Aller aux réglages
      </Link>
    </main>
  );
}
