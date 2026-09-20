"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Vue = "connexion" | "mot_de_passe_oublie";

export default function PageConnexion() {
  const router = useRouter();
  const [vue, setVue] = useState<Vue>("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lienEnvoye, setLienEnvoye] = useState(false);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: motDePasse });
    setEnCours(false);
    if (error) {
      setErreur("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function demanderReinitialisation(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/nouveau-mot-de-passe`,
    });
    setEnCours(false);
    // Réponse volontairement identique que l'email soit autorisé ou non
    // (pas d'énumération de compte).
    setLienEnvoye(true);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-safe">
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-medium text-foreground">Connexion</h1>

        {vue === "connexion" ? (
          <>
            <p className="mt-1 text-sm text-muted">Patrimoine — Maxime &amp; Amélie</p>
            <form onSubmit={seConnecter} className="mt-8 space-y-3">
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                autoFocus
                placeholder="ton@email.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-surface px-4 text-base text-foreground outline-none focus:border-accent"
              />
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="Mot de passe"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-surface px-4 text-base text-foreground outline-none focus:border-accent"
              />
              {erreur && <p className="text-sm text-negative">{erreur}</p>}
              <button
                type="submit"
                disabled={enCours}
                className="h-11 w-full rounded-lg bg-accent text-base font-medium text-accent-foreground disabled:opacity-60"
              >
                {enCours ? "Connexion…" : "Se connecter"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setVue("mot_de_passe_oublie");
                  setErreur(null);
                  setLienEnvoye(false);
                }}
                className="w-full text-center text-sm text-muted transition-colors hover:text-foreground"
              >
                Mot de passe oublié ?
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              Reçois un lien par email pour choisir un nouveau mot de passe.
            </p>
            {lienEnvoye ? (
              <p className="mt-8 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-foreground">
                Si un compte existe pour cette adresse, un email vient d&apos;être envoyé.
              </p>
            ) : (
              <form onSubmit={demanderReinitialisation} className="mt-8 space-y-3">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="ton@email.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-lg border border-line bg-surface px-4 text-base text-foreground outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={enCours}
                  className="h-11 w-full rounded-lg bg-accent text-base font-medium text-accent-foreground disabled:opacity-60"
                >
                  {enCours ? "Envoi…" : "Recevoir le lien"}
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => setVue("connexion")}
              className="mt-3 w-full text-center text-sm text-muted transition-colors hover:text-foreground"
            >
              ← Retour à la connexion
            </button>
          </>
        )}
      </div>
    </main>
  );
}
