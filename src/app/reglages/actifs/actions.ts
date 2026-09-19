"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { actifs } from "@/db/schema";

export async function creerActif(formData: FormData) {
  const libelle = String(formData.get("libelle") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const sourcePrix = String(formData.get("sourcePrix") ?? "").trim();
  if (!libelle || !type || !sourcePrix) return;

  await db.insert(actifs).values({
    libelle,
    type,
    sourcePrix,
    devise: String(formData.get("devise") ?? "EUR").trim() || "EUR",
    identifiantExterne: String(formData.get("identifiantExterne") ?? "").trim() || null,
    identifiantSource: String(formData.get("identifiantSource") ?? "").trim() || null,
  });
  revalidatePath("/reglages/actifs");
}
