"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { actifs, positions } from "@/db/schema";
import { rafraichirCoursActif } from "@/lib/pricing/rafraichir";

export async function creerPosition(formData: FormData) {
  const compteId = String(formData.get("compteId") ?? "").trim();
  const actifId = String(formData.get("actifId") ?? "").trim();
  const quantite = String(formData.get("quantite") ?? "").trim();
  const prixRevientMoyen = String(formData.get("prixRevientMoyen") ?? "").trim();
  if (!compteId || !actifId || !quantite) return;

  await db.insert(positions).values({
    compteId,
    actifId,
    quantite,
    prixRevientMoyen: prixRevientMoyen || null,
  });
  revalidatePath("/patrimoine");
}

/** Rafraîchit le cours de tous les actifs ayant une source automatique. */
export async function actualiserCours() {
  const liste = await db.select().from(actifs);
  await Promise.allSettled(liste.map((a) => rafraichirCoursActif(a.id)));
  revalidatePath("/patrimoine");
}
