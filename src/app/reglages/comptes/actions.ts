"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { comptes } from "@/db/schema";

export async function creerCompte(formData: FormData) {
  const libelle = String(formData.get("libelle") ?? "").trim();
  const institutionId = String(formData.get("institutionId") ?? "").trim();
  const personneId = String(formData.get("personneId") ?? "").trim();
  const enveloppeId = String(formData.get("enveloppeId") ?? "").trim();
  if (!libelle || !institutionId || !personneId || !enveloppeId) return;

  await db.insert(comptes).values({
    libelle,
    institutionId,
    personneId,
    enveloppeId,
    devise: String(formData.get("devise") ?? "EUR").trim() || "EUR",
  });
  revalidatePath("/reglages/comptes");
}
