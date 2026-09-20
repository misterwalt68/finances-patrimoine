"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Atterrissage après le lien reçu par email — que ce soit une vraie
 * réinitialisation ("mot de passe oublié") ou la toute première connexion
 * d'un compte tout juste créé (même mécanisme des deux côtés : un lien à
 * usage unique qui établit une session, puis ce formulaire). La session est
 * déjà valide à ce stade (échangée par /auth/callback juste avant).
 */
export default function PageNouveauMotDePasse() {
  const router = useRouter();
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (motDePasse.length < 8) {
      setErreur("8 caractères minimum.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setEnCours(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnCours(false);

    if (error) {
      setErreur("Le lien a peut-être expiré — redemande-en un depuis la page de connexion.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-safe">
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-medium text-foreground">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-muted">Choisis un mot de passe pour ton compte.</p>

        <form onSubmit={valider} className="mt-8 space-y-3">
          <input
            type="password"
            required
            autoComplete="new-password"
            autoFocus
            placeholder="Nouveau mot de passe"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="h-11 w-full rounded-lg border border-line bg-surface px-4 text-base text-foreground outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder="Confirme le mot de passe"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="h-11 w-full rounded-lg border border-line bg-surface px-4 text-base text-foreground outline-none focus:border-accent"
          />
          {erreur && <p className="text-sm text-negative">{erreur}</p>}
          <button
            type="submit"
            disabled={enCours}
            className="h-11 w-full rounded-lg bg-accent text-base font-medium text-accent-foreground disabled:opacity-60"
          >
            {enCours ? "Enregistrement…" : "Valider"}
          </button>
        </form>
      </div>
    </main>
  );
}
