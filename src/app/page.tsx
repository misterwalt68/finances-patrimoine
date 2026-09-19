import Link from "next/link";
import { db } from "@/db";
import { personnes, institutions, comptes, actifs, categories } from "@/db/schema";
import { getUser } from "@/lib/supabase/server";
import { Carte } from "@/components/ui/carte";
import { deconnexion } from "./actions";

export default async function PageAccueil() {
  const [user, nbPersonnes, nbInstitutions, nbComptes, nbActifs, nbCategories] = await Promise.all([
    getUser(),
    db.$count(personnes),
    db.$count(institutions),
    db.$count(comptes),
    db.$count(actifs),
    db.$count(categories),
  ]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-safe pt-safe">
      <header className="flex items-center justify-between py-6">
        <h1 className="text-lg font-medium text-foreground">Patrimoine</h1>
        <form action={deconnexion}>
          <button type="submit" className="text-sm text-muted transition-colors hover:text-foreground">
            Déconnexion
          </button>
        </form>
      </header>

      <Carte>
        <p className="text-sm text-muted">Ta vie te coûte</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground">
          — €<span className="text-lg font-normal text-muted"> / jour</span>
        </p>
        <p className="mt-3 text-sm text-muted">
          Arrive une fois les dépenses et positions branchées (lots 1 à 3). Connecté en
          tant que {user?.email ?? "toi"}.
        </p>
      </Carte>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: "Personnes", n: nbPersonnes },
          { label: "Établissements", n: nbInstitutions },
          { label: "Comptes", n: nbComptes },
          { label: "Actifs", n: nbActifs },
          { label: "Catégories", n: nbCategories },
        ].map((s) => (
          <Carte key={s.label}>
            <p className="text-2xl font-semibold tracking-tight text-foreground">{s.n}</p>
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
