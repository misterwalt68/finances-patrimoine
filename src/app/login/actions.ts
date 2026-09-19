"use server";

import { createClient } from "@/lib/supabase/server";

export async function envoyerLienMagique(
  _prevState: { envoye: boolean; erreur: string | null },
  formData: FormData,
): Promise<{ envoye: boolean; erreur: string | null }> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { envoye: false, erreur: "Adresse email requise." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
    },
  });

  if (error) {
    console.error("[envoyerLienMagique]", error.status, error.code, error.message);
    return { envoye: false, erreur: "Envoi impossible. Réessaie." };
  }

  // Réponse volontairement identique que l'email soit autorisé ou non
  // (pas d'énumération de compte) — le proxy rejette de toute façon toute
  // adresse différente de OWNER_EMAIL au retour du lien.
  return { envoye: true, erreur: null };
}
