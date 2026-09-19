import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { deconnexion } from "./actions";

export default async function PageAccueil() {
  const user = await getUser();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-safe pt-safe">
      <header className="flex items-center justify-between py-6">
        <h1 className="text-lg font-medium text-foreground">Patrimoine</h1>
        <form action={deconnexion}>
          <button type="submit" className="text-sm text-muted">
            Déconnexion
          </button>
        </form>
      </header>

      <p className="text-sm text-muted">
        Connecté en tant que {user?.email}. L&apos;écran d&apos;accueil (coût et gain
        quotidiens, patrimoine, allocation) arrive au lot 3 — pour l&apos;instant, configure
        tes établissements, comptes, enveloppes, actifs, catégories et personnes.
      </p>

      <Link
        href="/reglages"
        className="mt-6 flex h-11 items-center justify-center rounded-lg bg-accent text-base font-medium text-accent-foreground"
      >
        Aller aux réglages
      </Link>
    </main>
  );
}
