"use client";

import { useActionState } from "react";
import { envoyerLienMagique } from "./actions";

const etatInitial = { envoye: false, erreur: null as string | null };

export default function PageConnexion() {
  const [etat, action, enCours] = useActionState(
    envoyerLienMagique,
    etatInitial,
  );

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-safe">
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-medium text-foreground">Connexion</h1>
        <p className="mt-1 text-sm text-muted">
          Reçois un lien de connexion par email.
        </p>

        {etat.envoye ? (
          <p className="mt-8 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-foreground">
            Lien envoyé. Ouvre l&apos;email depuis ton iPhone et suis le lien.
          </p>
        ) : (
          <form action={action} className="mt-8 space-y-3">
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              autoFocus
              placeholder="ton@email.fr"
              className="h-11 w-full rounded-lg border border-line bg-surface px-4 text-base text-foreground outline-none focus:border-accent"
            />
            {etat.erreur ? (
              <p className="text-sm text-negative">{etat.erreur}</p>
            ) : null}
            <button
              type="submit"
              disabled={enCours}
              className="h-11 w-full rounded-lg bg-accent text-base font-medium text-accent-foreground disabled:opacity-60"
            >
              {enCours ? "Envoi…" : "Recevoir le lien"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
